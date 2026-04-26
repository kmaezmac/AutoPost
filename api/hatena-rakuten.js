import { fetchRakutenProduct, callOpenAI, postToHatena } from './_common.js';

const AFFILIATE_PLACEHOLDER = '%%AFFILIATE_URL%%';

const SYSTEM_PROMPT = `あなたははてなブログで人気のアフィリエイトブロガーです。
読者に商品の魅力を自然に伝え、購入意欲を高める記事を書いてください。
AIっぽい表現・広告感が強い表現は禁止。実際に使った体験談として自然な口語体で。`;

const CATEGORIES = ['美容・コスメ', '食品・飲料', '生活雑貨', 'ファッション・アパレル', '家電・デジタル', 'スポーツ・アウトドア', '本・教育', 'ベビー・キッズ', '健康・医療', 'インテリア・家具', 'その他'];

const buildUserPrompt = (itemName, catchcopy, itemCaption, reviewAverage, reviewCount) => `
以下の楽天市場の商品情報をもとに、はてなブログ用の記事をJSON形式で作成してください。

【条件】
- 記事本文は600〜1000字（日本語）
- HTML形式（h2, h3, p, ul, li タグを使用。h1は使わない）
- 実際に商品を使った体験談として書く
- 記事の先頭に以下の開示文を必ず含める：
  <p><small>※本記事にはアフィリエイトリンク（PR）が含まれます。</small></p>
- 商品画像を以下の形式で本文内に1箇所入れる（%%IMAGE_URL%% はプレースホルダーのまま）：
  <p><img src="%%IMAGE_URL%%" alt="${itemName}" /></p>
- アフィリエイトリンクは本文末尾に以下HTMLをそのまま使う（URLを変更しない）：
  <p><a href="${AFFILIATE_PLACEHOLDER}" target="_blank" rel="noopener nofollow">楽天市場で見てみる →</a></p>
- カテゴリは以下から最も適切なものを1〜3個選ぶ: ${CATEGORIES.join(', ')}
- タグは5〜8個（はてなブログのタグ用・日本語キーワード）

【出力JSON形式】
{
  "title": "記事タイトル（30〜50字）",
  "content": "HTML本文",
  "categories": ["カテゴリ1", ...],
  "tags": ["タグ1", "タグ2", ...]
}

【商品情報】
商品名: ${itemName}
キャッチコピー: ${catchcopy}
商品説明: ${itemCaption}
レビュー: ${reviewAverage}点（${reviewCount}件）
`;

export default async function handler(req, res) {
    try {
        console.log('[hatena-rakuten] fetching product...');
        const product = await fetchRakutenProduct();
        console.log('[hatena-rakuten] product:', product.itemName);

        console.log('[hatena-rakuten] calling OpenAI...');
        const aiRaw = await callOpenAI(SYSTEM_PROMPT, buildUserPrompt(
            product.itemName, product.catchcopy, product.itemCaption,
            product.reviewAverage, product.reviewCount,
        ), true);
        const article = JSON.parse(aiRaw);
        console.log('[hatena-rakuten] title:', article.title);

        // プレースホルダーを実際の値に置換
        let content = article.content
            .replace(new RegExp(AFFILIATE_PLACEHOLDER, 'g'), product.affiliateUrl)
            .replace(/%%IMAGE_URL%%/g, product.imageUrl || '');

        // はてなブログのカテゴリ + タグを結合
        const categories = [
            ...(article.categories || []),
            '楽天', '楽天市場', '楽天アフィリエイト',
            ...(article.tags || []),
        ];

        await postToHatena({ title: article.title, content, categories });
        console.log('[hatena-rakuten] posted successfully');

        res.status(200).json({ success: true, title: article.title });
    } catch (error) {
        console.error('[hatena-rakuten] error:', error.message);
        console.error('[hatena-rakuten] detail:', error.response?.data);
        res.status(500).json({ error: error.message });
    }
}
