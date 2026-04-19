import { fetchAmazonProduct, callOpenAI, createWordPressPost } from './_common.js';

const SYSTEM_PROMPT = `あなたはSEOに精通したプロのアフィリエイトブロガーです。
読者に商品の魅力を自然に伝え、購入意欲を高める記事を書いてください。
AIっぽい表現・広告感が強い表現は禁止。実際に使った体験談として自然な口語体で書くこと。`;

// Amazon Associates規約: "Amazonのアソシエイトとして〜" の開示文が必須
const AMAZON_DISCLOSURE = `<p class="af-disclosure">※本記事にはアフィリエイトリンク（PR）が含まれます。Amazonのアソシエイトとして、当ブログは適格販売により収入を得ています。</p>`;

const buildUserPrompt = (title, features, affiliateUrl) => `
以下のAmazon商品情報をもとに、SEO最適化されたWordPressブログ記事をJSON形式で作成してください。

【条件】
- 記事本文は800〜1200字（日本語）
- HTML形式（h2, h3, p, ul, li タグを使用。h1は使わない）
- 実際に商品を使った体験談として書く
- 記事の先頭（h2の前）に以下の開示文を必ず含める（変更不可）：
  ${AMAZON_DISCLOSURE}
- アフィリエイトリンクは本文末尾の「購入はこちら」セクションに1箇所のみ配置：
  <a href="${affiliateUrl}" rel="nofollow noopener noreferrer" target="_blank">Amazonで見てみる →</a>
- SEO意識のタイトル（商品名＋メリット・特徴を含む、30〜40字）
- ハッシュタグは本文に入れない（タグ配列で別途渡す）
- タグは5〜10個（商品カテゴリ・特徴・ベネフィット等の日本語キーワード）

【出力JSON形式】
{
  "title": "SEO記事タイトル",
  "content": "HTML本文（開示文〜購入リンク含む）",
  "excerpt": "記事の要約（100〜120字）",
  "tags": ["タグ1", "タグ2", ...]
}

【商品情報】
商品名: ${title}
特徴・説明:
${features.map((f, i) => `${i + 1}. ${f}`).join('\n')}
`;

export default async function handler(req, res) {
    try {
        console.log('[wp-amazon] fetching product...');
        const product = await fetchAmazonProduct();
        console.log('[wp-amazon] product:', product.title);

        console.log('[wp-amazon] calling OpenAI...');
        const aiRaw = await callOpenAI(
            SYSTEM_PROMPT,
            buildUserPrompt(product.title, product.features, product.affiliateUrl),
            true
        );
        const article = JSON.parse(aiRaw);
        console.log('[wp-amazon] article title:', article.title);

        const post = await createWordPressPost({
            title: article.title,
            content: article.content,
            excerpt: article.excerpt,
            tagNames: article.tags || [],
        });
        console.log('[wp-amazon] posted:', post.link);

        res.status(200).json({ success: true, url: post.link, title: article.title });
    } catch (error) {
        console.error('[wp-amazon] error:', error.message);
        console.error('[wp-amazon] detail:', error.response?.data);
        res.status(500).json({ error: error.message });
    }
}
