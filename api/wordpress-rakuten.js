import { fetchRakutenProduct, callOpenAI, createWordPressPost } from './_common.js';

const AFFILIATE_PLACEHOLDER = '%%AFFILIATE_URL%%';

const SYSTEM_PROMPT = `あなたはSEOに精通したプロのアフィリエイトブロガーです。
読者に商品の魅力を自然に伝え、購入意欲を高める記事を書いてください。
AIっぽい表現・広告感が強い表現は禁止。実際に使った体験談として自然な口語体で書くこと。`;

const CATEGORIES = ['美容・コスメ', '食品・飲料', '生活雑貨', 'ファッション・アパレル', '家電・デジタル', 'スポーツ・アウトドア', '本・教育', 'ベビー・キッズ', '健康・医療', 'インテリア・家具', 'その他'];

const buildUserPrompt = (itemName, catchcopy, itemCaption, reviewAverage, reviewCount) => `
以下の楽天市場の商品情報をもとに、SEO最適化されたWordPressブログ記事をJSON形式で作成してください。

【条件】
- 記事本文は800〜1200字（日本語）
- HTML形式（h2, h3, p, ul, li タグを使用。h1は使わない）
- 実際に商品を使った体験談として書く
- 記事の先頭（h2の前）に以下の開示文を必ず含める：
  <p class="af-disclosure">※本記事にはアフィリエイトリンク（PR）が含まれます。</p>
- アフィリエイトリンクは本文末尾の「購入はこちら」セクションに以下HTMLをそのまま使う（URLを変更しない）：
  <a href="${AFFILIATE_PLACEHOLDER}" rel="nofollow noopener noreferrer" target="_blank">楽天市場で見てみる →</a>
- SEO意識のタイトル（商品名＋メリット・特徴を含む、30〜40字）
- タグは5〜10個（商品カテゴリ・特徴・ベネフィット等の日本語キーワード）
- カテゴリは以下から最も適切なものを1つ選ぶ: ${CATEGORIES.join(', ')}

【出力JSON形式】
{
  "title": "SEO記事タイトル",
  "content": "HTML本文（開示文〜購入リンク含む）",
  "excerpt": "記事の要約（100〜120字）",
  "tags": ["タグ1", "タグ2", ...],
  "category": "カテゴリ名"
}

【商品情報】
商品名: ${itemName}
キャッチコピー: ${catchcopy}
商品説明: ${itemCaption}
レビュー: ${reviewAverage}点（${reviewCount}件）
`;

export default async function handler(req, res) {
    try {
        console.log('[wp-rakuten] fetching product...');
        const product = await fetchRakutenProduct();
        console.log('[wp-rakuten] product:', product.itemName);

        console.log('[wp-rakuten] calling OpenAI...');
        const aiRaw = await callOpenAI(
            SYSTEM_PROMPT,
            buildUserPrompt(product.itemName, product.catchcopy, product.itemCaption, product.reviewAverage, product.reviewCount),
            true
        );
        const article = JSON.parse(aiRaw);
        console.log('[wp-rakuten] article title:', article.title);
        console.log('[wp-rakuten] category:', article.category);

        // プレースホルダーを実際のアフィリエイトURLに置換
        article.content = article.content.replace(new RegExp(AFFILIATE_PLACEHOLDER, 'g'), product.affiliateUrl);

        const post = await createWordPressPost({
            title: article.title,
            content: article.content,
            excerpt: article.excerpt,
            tagNames: article.tags || [],
            categoryName: article.category || null,
            featuredImageUrl: product.imageUrl || null,
        });
        console.log('[wp-rakuten] posted:', post.link);

        res.status(200).json({ success: true, url: post.link, title: article.title });
    } catch (error) {
        console.error('[wp-rakuten] error:', error.message);
        console.error('[wp-rakuten] detail:', error.response?.data);
        res.status(500).json({ error: error.message });
    }
}
