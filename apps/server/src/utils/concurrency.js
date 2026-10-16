/**
 * 以受限并发度并行执行异步任务，并保持结果与输入顺序一致。
 *
 * 用于多渠道推送：相比串行 for-await 可显著降低总延迟；相比无上限的
 * Promise.all 又能避免单接口绑定大量渠道时瞬时打开过多外部连接。
 *
 * 注意：iterator 不应抛出（调用方需自行 try/catch 并返回结果对象），
 * 否则任一任务 reject 会导致整体 reject。
 *
 * @template T, R
 * @param {T[]} items 待处理项
 * @param {number} limit 最大并发度（<1 时按 1 处理）
 * @param {(item: T, index: number) => Promise<R>} iterator 处理函数
 * @returns {Promise<R[]>} 与 items 顺序一致的结果数组
 */
async function mapWithConcurrency(items, limit, iterator) {
  const results = new Array(items.length);
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await iterator(items[index], index);
    }
  };

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, worker));

  return results;
}

module.exports = { mapWithConcurrency };
