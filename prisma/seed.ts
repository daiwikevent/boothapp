/**
 * prisma/seed.ts
 * Seeds the database with the 15 system presets from docs/07-Preset-Prompt-Library.md.
 * System presets have ownerId = null (readable by all operators, writable only by admin).
 *
 * Run: npm run db:seed
 * (Safe to re-run — uses upsert by name so it won't duplicate.)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// System prompt wrapper — stored separately; assembled in /api/generate (T10)
// Duplicated here for reference only.
export const SYSTEM_WRAPPER = `Edit this photo of a person. CRITICAL RULES:
- Preserve the person's face, facial features, skin tone, expression,
  and identity EXACTLY as in the original photo. Do not beautify,
  slim, lighten skin, or alter age or gender.
- Keep the same number of people as in the original photo.
- All clothing must be modest and fully covering. Content must be
  family-friendly and appropriate for all ages including children.
- Replace the attire and background as described below.
- Output a single photorealistic image, portrait orientation,
  professional studio quality, sharp focus on faces.

THEME: {preset_prompt}`;

// ─── Preset definitions ────────────────────────────────────────────────────

const PRESETS = [
  // ── Wedding & Celebration ─────────────────────────────────────────────────
  {
    name: "Royal Rajasthan",
    peopleTag: "SOLO" as const,
    sortOrder: 1,
    prompt: `Dress the subject in regal Rajasthani royal attire: for men, an ornate
cream-and-gold sherwani with an embroidered saafa turban, pearl
necklace layers, and a ceremonial sword at the waist; for women, a
deep red and gold lehenga with heavy zardozi embroidery, kundan
jewellery, maang tikka, and bangles. Background: a grand sandstone
palace courtyard at golden hour with carved jharokha arches, marble
pillars, and warm lantern light. Mood: majestic royal portrait,
painterly warm lighting.`,
  },
  {
    name: "Mehandi Garden",
    peopleTag: "GROUP" as const,
    sortOrder: 2,
    prompt: `Dress the subjects in fresh festive mehandi-ceremony attire in sage
green, lemon yellow, and blush pink: flowy anarkalis or lehengas with
floral gota-patti work for women, pastel kurtas with Nehru jackets for
men, floral jewellery (genda phool garlands, flower bracelets).
Background: a daytime garden mehandi setup with marigold strings,
hanging floral umbrellas, brass lanterns, and a swing decorated with
flowers. Mood: bright, joyful, sun-drenched festive afternoon.`,
  },
  {
    name: "Sangeet Glam",
    peopleTag: "COUPLE" as const,
    sortOrder: 3,
    prompt: `Dress the subjects in glamorous sangeet-night party wear: shimmering
sequined saree or cocktail lehenga in midnight blue and silver for
women with statement chandelier earrings; a sharp embroidered bandhgala
or velvet blazer in deep wine for men. Background: a luxurious indoor
sangeet stage at night with warm fairy-light curtains, crystal
chandeliers, and soft bokeh. Mood: high-glam evening celebration,
cinematic warm-and-cool lighting.`,
  },
  {
    name: "Haldi Glow",
    peopleTag: "GROUP" as const,
    sortOrder: 4,
    prompt: `Dress the subjects in traditional haldi-ceremony yellow: simple elegant
yellow kurtas or sarees with white floral jewellery (jasmine and
mogra), light dupattas. Background: a sunlit courtyard haldi setup with
yellow and white drapes, marigold garlands, brass urli bowls with
floating flowers. Subtle festive turmeric-yellow color grading. Mood:
warm, playful, glowing morning ceremony.`,
  },
  {
    name: "South Indian Temple Classic",
    peopleTag: "COUPLE" as const,
    sortOrder: 5,
    prompt: `Dress the subjects in classic South Indian wedding attire: rich
kanjeevaram silk saree in deep maroon with broad gold zari border,
temple jewellery, gajra in the hair for women; cream silk veshti with
gold border, angavastram, and a simple gold chain for men. Background:
an ancient stone temple corridor with carved granite pillars and warm
oil-lamp light. Mood: timeless, devotional elegance, rich warm tones.`,
  },
  {
    name: "Vintage Mumbai Retro",
    peopleTag: "COUPLE" as const,
    sortOrder: 6,
    prompt: `Transform into a 1970s Indian retro film-poster style portrait: men in
a wide-collared patterned shirt with flared trousers and aviator
sunglasses tucked in the pocket; women in a chiffon polka-dot saree
with winged eyeliner, a rose in styled retro hair. Background: a
vintage city street with an old black-and-yellow taxi, hand-painted
signboards, and warm faded film grain. Mood: nostalgic retro glamour,
slightly desaturated 70s film color palette.`,
  },
  // ── Universal / Corporate ─────────────────────────────────────────────────
  {
    name: "Classic Studio B&W",
    peopleTag: "SOLO" as const,
    sortOrder: 7,
    prompt: `Dress the subject in timeless formal wear: a tailored black suit with
white shirt, or an elegant black evening gown/saree. Background: plain
dark studio backdrop with a single dramatic key light from the side.
Convert to high-contrast black-and-white fine-art portrait with rich
tonal range. Mood: prestige magazine portrait, sharp and classic.`,
  },
  {
    name: "Executive Headshot Pro",
    peopleTag: "SOLO" as const,
    sortOrder: 8,
    prompt: `Dress the subject in modern business attire: a well-fitted navy suit
with light shirt, or a formal blazer over an elegant top. Background:
softly blurred contemporary office with glass and warm wood tones,
shallow depth of field. Professional three-point lighting, confident
approachable look. Mood: premium corporate headshot for a company
website.`,
  },
  {
    name: "Cyber Neon Night",
    peopleTag: "COUPLE" as const,
    sortOrder: 9,
    prompt: `Dress the subjects in sleek futuristic streetwear: dark techwear
jackets with subtle glowing trim, modern minimal accessories.
Background: a rain-slicked neon-lit city street at night with cyan and
magenta signboards reflecting on wet pavement, light haze. Mood:
stylish futuristic night portrait, vivid neon rim lighting.`,
  },
  {
    name: "Royal Oil Painting",
    peopleTag: "COUPLE" as const,
    sortOrder: 10,
    prompt: `Transform into a classical oil-painting style royal portrait: subjects
in opulent vintage aristocratic attire — velvet coats with gold braid,
or rich silk gowns with pearl jewellery. Background: a stately study
with a heavy drape, globe, and gilded frame aesthetic, painted
brushstroke texture throughout while keeping faces clearly
recognizable. Mood: museum-quality classical portrait painting.`,
  },
  // ── Fun / Kids / Group ────────────────────────────────────────────────────
  {
    name: "Little Astronaut",
    peopleTag: "SOLO" as const,
    sortOrder: 11,
    prompt: `Dress the child in a friendly white space suit with mission patches,
helmet held under one arm. Background: a colorful spaceship interior
window view of Earth, planets and soft stars, gentle cartoon-real
hybrid style that stays photorealistic on the face. Mood: wonder and
adventure, bright cheerful lighting.`,
  },
  {
    name: "Jungle Explorer",
    peopleTag: "GROUP" as const,
    sortOrder: 12,
    prompt: `Dress the subjects in khaki explorer outfits with safari hats and
binoculars around the neck. Background: a lush sunlit jungle clearing
with giant leaves, a friendly parrot on a branch, and soft rays of
light through the canopy. Mood: storybook adventure, warm green
tones, family-friendly.`,
  },
  {
    name: "Cricket Star",
    peopleTag: "SOLO" as const,
    sortOrder: 13,
    prompt: `Dress the subject in a generic professional cricket uniform in plain
royal blue with no team logos or sponsor marks, holding a cricket bat,
stadium floodlights behind. Background: a packed cricket stadium at
night with dramatic light and shallow crowd bokeh. Mood: heroic sports
poster, confident champion energy. Do not include any real team names,
logos, or branding.`,
  },
  {
    name: "Bollywood Retro Poster",
    peopleTag: "GROUP" as const,
    sortOrder: 14,
    prompt: `Transform the group into a dramatic vintage Indian movie-poster style
composition: everyone in coordinated 1980s formal retro outfits, posed
like an ensemble film cast. Background: hand-painted poster art style
sky in orange and teal with bold empty space at the top for a title.
Keep all faces photorealistic and recognizable. Mood: fun dramatic
retro poster. Do not reference any real film, actor, or title.`,
  },
  {
    name: "Monsoon Romance",
    peopleTag: "COUPLE" as const,
    sortOrder: 15,
    prompt: `Dress the couple in elegant rain-evening attire: a dark suit for him,
a flowing teal saree for her, sharing a large black umbrella.
Background: a charming old-town street in soft rain at dusk, glowing
street lamps, reflections on cobblestones, light mist. Mood: cinematic
romantic rain scene, cool tones with warm lamp highlights.`,
  },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding system presets...\n");

  for (const preset of PRESETS) {
    const result = await prisma.preset.upsert({
      where: {
        // Upsert by name among system presets (ownerId null)
        // Using a raw findFirst + create/update since Prisma upsert needs a unique field
        // Workaround: use a composite unique that we'll add, or use name+ownerId=null
        // For now: find by name among system presets
        id: (
          await prisma.preset.findFirst({
            where: { name: preset.name, ownerId: null },
          })
        )?.id ?? "does-not-exist",
      },
      update: {
        prompt: preset.prompt,
        peopleTag: preset.peopleTag,
        sortOrder: preset.sortOrder,
        isActive: true,
      },
      create: {
        name: preset.name,
        prompt: preset.prompt,
        peopleTag: preset.peopleTag,
        sortOrder: preset.sortOrder,
        ownerId: null, // system preset
        isActive: true,
      },
    });

    console.log(`  ✅ ${result.name} (${result.peopleTag})`);
  }

  const count = await prisma.preset.count({ where: { ownerId: null } });
  console.log(`\n✨ Done — ${count} system presets in database.`);

  console.log("\n🌱 Seeding billing plans...\n");
  const DEFAULT_PLANS = [
    {
      name: "STARTER",
      label: "Starter",
      priceInr: 799,
      credits: 54,
      features: [
        "~18 AI photos/month",
        "Indian + Universal System Presets",
        "Basic Operator Dashboard",
        "Watermark on output image",
        "Email support",
      ],
      hasCustomPresets: false,
      hasCustomLogo: false,
      hasNoWatermark: false,
      hasCsvReports: false,
      hasAttendantPin: false,
    },
    {
      name: "PRO",
      label: "Pro",
      priceInr: 1599,
      credits: 120,
      features: [
        "~40 AI photos/month",
        "Custom style presets (create own prompts)",
        "Live slideshow public page",
        "Watermark on output image",
        "Print support (4x6 layout)",
        "Attendant PIN lock settings",
      ],
      hasCustomPresets: true,
      hasCustomLogo: false,
      hasNoWatermark: false,
      hasCsvReports: false,
      hasAttendantPin: true,
    },
    {
      name: "BUSINESS",
      label: "Business",
      priceInr: 2999,
      credits: 240,
      features: [
        "~80 AI photos/month",
        "NO brand watermark (White-label)",
        "Custom operator logo overlay",
        "CSV usage reports export",
        "Priority WhatsApp support",
      ],
      hasCustomPresets: true,
      hasCustomLogo: true,
      hasNoWatermark: true,
      hasCsvReports: true,
      hasAttendantPin: true,
    },
  ];

  for (const plan of DEFAULT_PLANS) {
    const result = await prisma.billingPlan.upsert({
      where: { name: plan.name },
      update: {
        label: plan.label,
        priceInr: plan.priceInr,
        credits: plan.credits,
        features: plan.features,
        hasCustomPresets: plan.hasCustomPresets,
        hasCustomLogo: plan.hasCustomLogo,
        hasNoWatermark: plan.hasNoWatermark,
        hasCsvReports: plan.hasCsvReports,
        hasAttendantPin: plan.hasAttendantPin,
      },
      create: {
        name: plan.name,
        label: plan.label,
        priceInr: plan.priceInr,
        credits: plan.credits,
        features: plan.features,
        hasCustomPresets: plan.hasCustomPresets,
        hasCustomLogo: plan.hasCustomLogo,
        hasNoWatermark: plan.hasNoWatermark,
        hasCsvReports: plan.hasCsvReports,
        hasAttendantPin: plan.hasAttendantPin,
        isActive: true,
      },
    });
    console.log(`  ✅ Plan: ${result.label} (₹${result.priceInr})`);
  }

  console.log("\n✨ Database seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
