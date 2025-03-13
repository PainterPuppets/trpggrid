import { NextResponse } from "next/server";
import { isApiWarmedUp } from "../warmup/route";

// 自定义 fetch 函数，包含重试逻辑
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
  timeout = 8000,
  retryDelay = 1000
) {
  // 创建超时控制器，与传入的信号分开处理
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

  // 处理信号：如果options中有信号，则用已有信号，否则使用timeoutController的信号
  const signal = options.signal || timeoutController.signal;

  try {
    const response = await fetch(url, {
      ...options,
      signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // // 如果是超时导致的错误，不进行重试
    // if (timeoutController.signal.aborted) {
    //   throw new Error("请求超时");
    // }

    // 如果是外部取消导致的错误，直接抛出
    if ((error as any).name === "AbortError") {
      throw error;
    }

    if (retries <= 0) throw error;

    console.log(`请求失败，${retries}次重试后再尝试...`, error);
    // 等待一段时间再重试
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
    return fetchWithRetry(url, options, retries - 1, timeout, retryDelay);
  }
}

// 为模组列表请求定制的更积极的重试策略
async function fetchGameList(url: string, options: RequestInit) {
  // 模组列表接口使用更积极的重试策略
  return fetchWithRetry(url, options, 5, 5000, 500);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "搜索词不能为空" }, { status: 400 });
  }

  // 使用 ReadableStream 创建流式响应
  const stream = new ReadableStream({
    async start(controller) {
      // 发送初始状态
      controller.enqueue(
        new TextEncoder().encode(
          JSON.stringify({
            type: "init",
            message: "正在搜索...",
          }) + "\n"
        )
      );

      try {
        console.log(`开始搜索模组: "${query}"`);

        // 创建一个新的 AbortController 仅用于这次搜索请求
        const searchAbortController = new AbortController();

        // 搜索模组
        const searchUrl = `https://api.dicecho.com/api/mod?keyword=${encodeURIComponent(
          query
        )}`;
        console.log(`发送搜索请求到: ${searchUrl}`);

        try {
          const searchResponse = await fetchGameList(searchUrl, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
              Accept: "application/json",
              "Accept-Language": "en-US,en;q=0.9",
            },
            signal: searchAbortController.signal,
          });

          console.log(`搜索响应状态: ${searchResponse.status}`);

          if (!searchResponse.ok) {
            throw new Error(`API 错误: ${searchResponse.status}`);
          }

          const searchData = await searchResponse.json();

          console.log('searchData', searchData)

          console.log(
            `搜索结果数量: ${searchData.data ? searchData.data.totalCount : 0}`
          );

          if (!searchData.data || searchData.data.totalCount === 0) {
            console.log("没有找到搜索结果");
            controller.enqueue(
              new TextEncoder().encode(
                JSON.stringify({
                  type: "end",
                  message: "没有找到任何模组",
                }) + "\n"
              )
            );
            controller.close();
            return;
          }

          // 发送初始消息，告知前端总模组数量
          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({
                type: "init",
                total: Math.min(searchData.data.length, 10),
              }) + "\n"
            )
          );

          // 处理前10个搜索结果
          const results = searchData.data.data.slice(0, 10);
          let successCount = 0;

          // 为封面请求创建单独的 AbortController
          const coverAbortController = new AbortController();

          // 同时请求多个模组的封面，但限制并发数
          const batchSize = 2; // 每批处理的模组数

          for (let i = 0; i < results.length; i += batchSize) {
            const batch = results.slice(i, i + batchSize);

            console.log('batch', batch)

            // 并行处理每个批次中的模组
            await Promise.all(
              batch.map((game) =>
                processGame(game, coverAbortController.signal)
              )
            );

            // 添加每批次的延迟，减轻API负担
            if (i + batchSize < results.length) {
              await new Promise((resolve) => setTimeout(resolve, 200));
            }
          }

          // 根据结果发送不同的结束消息
          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({
                type: "end",
                message:
                  successCount > 0
                    ? "所有模组数据已发送完成"
                    : "未能获取模组封面，请重试",
                successCount,
              }) + "\n"
            )
          );

          // 处理单个模组
          async function processGame(game: any, signal: AbortSignal) {
            try {
              console.log(`处理模组: ${game._id} (${game.title})`);

              // 先发送模组的基本信息，不含图片
              controller.enqueue(
                new TextEncoder().encode(
                  JSON.stringify({
                    type: "gameStart",
                    game: {
                      id: game._id,
                      name: game.title,
                      image: game.coverUrl,
                    },
                  }) + "\n"
                )
              );

              successCount++;
            } catch (error) {
              // 检查是否是取消请求导致的错误
              if ((error as any).name === "AbortError") {
                // 对于取消的请求，只记录，不向客户端发送错误
                console.log(`模组 ${game.id} 请求被取消`);
                return;
              }

              console.error(`处理模组 ${game.id} 失败:`, error);

              // 发送失败信息
              controller.enqueue(
                new TextEncoder().encode(
                  JSON.stringify({
                    type: "gameError",
                    gameId: game.id,
                    error: "获取模组信息失败",
                  }) + "\n"
                )
              );
            }
          }
        } catch (searchError) {
          // 如果是取消错误，这通常是由于客户端断开连接
          if ((searchError as any).name === "AbortError") {
            console.log("搜索请求被取消");
            return;
          }

          throw searchError; // 重新抛出其他错误
        }

        // 关闭流
        controller.close();
      } catch (error) {
        console.error("搜索模组失败:", error);

        // 发送错误信息
        controller.enqueue(
          new TextEncoder().encode(
            JSON.stringify({
              type: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "搜索模组失败，请稍后再试",
            }) + "\n"
          )
        );

        // 关闭流
        controller.close();
      }
    },
  });

  // 返回流式响应
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
