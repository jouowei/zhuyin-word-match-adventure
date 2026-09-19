/**
 * One picture per place of 環島冒險 (services/journey.ts), shown on the story page when the companion arrives,
 * plus `around`: back at 基隆港 after a whole trip. Each shows the place and, in front, the friend met there.
 * Keep them true to the place's story.
 */
export const JOURNEY_STYLE = [
  "Children's picture-book illustration in soft watercolor and colored pencil, like a gentle hand-painted storybook.",
  'Muted, soft pastel colors with low saturation. Never bright, neon or high-contrast.',
  'Wide landscape picture with a calm, uncluttered composition and a soft sky.',
  'No people in the front; at most a few tiny figures far away.',
  'Absolutely no text, letters, numbers, Chinese characters, labels, writing on signs, logos, frames, borders or watermarks.',
].join(' ');

export const JOURNEY_SCENES: Record<string, string> = {
  keelung: 'Keelung harbor in northern Taiwan: big ships at the pier, a small lighthouse, colorful houses on green hills around the harbor, and in the front a friendly little seagull standing on a mooring post, as if welcoming travelers.',
  taipei: 'Taipei, Taiwan: the Taipei 101 tower rising above the city, its shape stacked in segments like a stalk of bamboo, green mountains behind. In the front, on a tree branch in a city park, a friendly little squirrel looking at the tower.',
  hsinchu: 'Hsinchu, the windy city of Taiwan, by the sea: colorful kites flying high in a strong breeze over a grassy seaside park, grass and trees bending in the wind. In the front a fluffy little chick with its feathers ruffled by the wind, looking up at the kites.',
  miaoli: 'The hills of Miaoli, Taiwan, in spring: tung trees covered in small white tung blossoms, white petals falling onto a quiet mountain path like snow. In the front a little honeybee flying near the white flowers.',
  taichung: 'Rainbow Village in Taichung, Taiwan: a few small old one-story houses whose walls, and the ground in front of them, are painted all over with cheerful patterns, flowers, birds and simple animals in soft pastel colors. In the front a friendly little dog sitting and wagging its tail.',
  sunmoon: 'Sun Moon Lake in the mountains of central Taiwan: a wide calm lake surrounded by green mountains, soft morning mist, a tiny island in the lake, a small boat, tea bushes on the hillside. In the front, near the shore, a little fish jumping out of the water with a splash.',
  alishan: 'Alishan mountain in Taiwan at sunrise: a small red forest railway train on a narrow track winding between tall old cypress trees, a soft sea of white clouds below the mountains, the sun rising. In the front a little Formosan macaque sitting on a branch, watching the train.',
  tainan: 'Tainan, Taiwan: the old Anping Fort, weathered red brick walls with a white lookout tower, big old banyan trees with hanging roots beside it. In the front a little cat sitting on top of the old brick wall.',
  kaohsiung: 'Kaohsiung, Taiwan: the big harbor with ships and cranes, and the gently curving Love River with a low arched bridge flowing into it. In the front, in the blue harbor water, a friendly little dolphin leaping out of the water.',
  kenting: 'Kenting at the southern tip of Taiwan: a clear blue-green sea, a sandy beach and rocks, a white lighthouse on a green cape. In the front a little red land crab walking across the sand toward the sea.',
  taitung: 'Taitung, Taiwan, in summer: many hot air balloons floating in the sky above green hills and rice fields, some of them shaped like animals. In the front a gentle water buffalo standing in a green rice field.',
  hualien: 'Taroko Gorge in Hualien, Taiwan: very tall grey-white marble cliffs, a blue-green river running between them, a small red bridge. Up front, an eagle soaring with its wings spread wide.',
  yilan: 'The coast of Yilan, Taiwan: Guishan Island (Turtle Island) out at sea, shaped like a turtle swimming; a sandy beach, green mountains along the coast, soft steam rising from a small wooden hot spring pool among the trees. In the front a little turtle on the sand, looking out to sea.',
  jiufen: 'Jiufen old street on a mountainside in northern Taiwan: narrow stone steps between old wooden tea houses, many red lanterns hanging along the eaves, the sea far below. In the front a little cat sitting on the stone steps. Every sign and lantern is blank.',
  around: 'Back at Keelung harbor at the end of a trip around Taiwan: the harbor with ships under a big soft rainbow, colorful bunting flags along the pier, a few balloons floating up, a small lighthouse, a joyful welcome-home mood. In the front a little seagull flapping its wings happily.',
  // The start screen's cover (LoginView): the title goes on the sky, the players' cards over the middle
  'cover-tall': 'The cover of a picture book about a trip around Taiwan, tall. The top third is a pale, calm sky with two small kites and one small hot air balloon far away. In the middle: gentle green hills, a tiny red train on a track along a hillside, rice fields, and a small white lighthouse by a calm blue sea on the right. The bottom third: a meadow with small wildflowers and a winding path starting at the bottom edge and leading into the picture, like the beginning of a journey. No animals.',
  'cover-wide': 'The cover of a picture book about a trip around Taiwan, wide. The top part is a pale, calm sky with two small kites and one small hot air balloon far away. Below: gentle green hills, a tiny red train on a track along a hillside on the left, rice fields, a small white lighthouse by a calm blue sea on the right, and in the front a meadow with small wildflowers and a winding path leading into the picture, like the beginning of a journey. No animals.',
  // 練習課文 after choosing a player (ModePickView), not drawn yet: the card uses lesson picture 2up-6 for now
  'mode-practice': 'A cozy reading corner: an open picture book on a small wooden desk by a sunny window, a pencil and an eraser beside it, a small potted plant and a cup of warm tea, soft morning light. The pages of the book show only a simple painting of a tree and a little bird, with no writing at all. No people.',
};

/** Pictures that aren't 16:9. */
export const JOURNEY_ASPECT: Record<string, string> = { 'cover-tall': '9:16' };

export const journeyPromptFor = (id: string) => `${JOURNEY_STYLE} Scene: ${JOURNEY_SCENES[id]}`;
