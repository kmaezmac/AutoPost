import { fetchAmazonProduct, callOpenAI, createPinterestPin } from './_common.js';

const SYSTEM_PROMPT = `あなたはSNSマーケティングの専門家です。
Pinterestユーザーに商品の魅力を伝え、クリックしてもらえる説明文を書いてください。
AIっぽい表現は禁止。視覚的・感情的な言葉を使い、自然な口調で。`;

// Amazon Associates規約: 開示文必須 + Pinterest規約: #ad 必須
const buildUserPrompt = (title, features) => `
以下のAmazon商品情報をもとに、Pinterest用のPin説明文をJSON形式で作成してください。

【条件】
- 説明文は200〜400字（日本語）
- 最初の1〜2行で商品の最大の魅力を伝える（スクロールで切れても読める）
- 改行を適度に入れて読みやすく
- ハッシュタグを10〜15個末尾に付ける（商品カテゴリ・ライフスタイル・日本語）
- 末尾に「 #Amazon #ad #PR」を必ず含める（規約上の開示義務）
- タイトルは商品の魅力が伝わる50字以内のキャッチーな一文

【出力JSON形式】
{
  "title": "Pinタイトル（50字以内）",
  "description": "説明文＋ハッシュタグ（500字以内に収める）"
}

【商品情報】
商品名: ${title}
特徴・説明:
${features.map((f, i) => `${i + 1}. ${f}`).join('\n')}
`;

export default async function handler(req, res) {
    try {
        console.log('[pin-amazon] fetching product...');
        const product = await fetchAmazonProduct();
        console.log('[pin-amazon] product:', product.title);

        if (!product.imageUrl) throw new Error('Amazon: no image URL (Pinterest requires image)');

        console.log('[pin-amazon] calling OpenAI...');
        const aiRaw = await callOpenAI(
            SYSTEM_PROMPT,
            buildUserPrompt(product.title, product.features),
            true
        );
        const pinContent = JSON.parse(aiRaw);
        console.log('[pin-amazon] pin title:', pinContent.title);

        const boardId = process.env.PINTEREST_BOARD_ID_AMAZON || process.env.PINTEREST_BOARD_ID;
        const pin = await createPinterestPin({
            boardId,
            title: pinContent.title,
            description: pinContent.description,
            link: product.affiliateUrl,
            imageUrl: product.imageUrl,
        });
        console.log('[pin-amazon] pinned:', pin.id);

        res.status(200).json({ success: true, pinId: pin.id, title: pinContent.title });
    } catch (error) {
        console.error('[pin-amazon] error:', error.message);
        console.error('[pin-amazon] detail:', error.response?.data);
        res.status(500).json({ error: error.message });
    }
}
