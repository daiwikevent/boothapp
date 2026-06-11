# Preset Prompt Library — AI Photobooth

How this works: every generation sends **System Wrapper + Preset Prompt** to the Gemini image model along with the guest's photo. The wrapper guarantees identity preservation and safety no matter which preset runs; the preset supplies the theme. Test each preset in Google AI Studio with 4–5 different photos of yourself/family (different lighting, angles, with glasses, etc.) and tune wording until faces stay consistent.

---

## SYSTEM WRAPPER (fixed, wraps every preset)

```
Edit this photo of a person. CRITICAL RULES:
- Preserve the person's face, facial features, skin tone, expression,
  and identity EXACTLY as in the original photo. Do not beautify,
  slim, lighten skin, or alter age or gender.
- Keep the same number of people as in the original photo.
- All clothing must be modest and fully covering. Content must be
  family-friendly and appropriate for all ages including children.
- Replace the attire and background as described below.
- Output a single photorealistic image, portrait orientation,
  professional studio quality, sharp focus on faces.

THEME: {preset_prompt}
```

---

## WEDDING & CELEBRATION THEMES

### 1. Royal Rajasthan — Solo / Couple
```
Dress the subject in regal Rajasthani royal attire: for men, an ornate
cream-and-gold sherwani with an embroidered saafa turban, pearl
necklace layers, and a ceremonial sword at the waist; for women, a
deep red and gold lehenga with heavy zardozi embroidery, kundan
jewellery, maang tikka, and bangles. Background: a grand sandstone
palace courtyard at golden hour with carved jharokha arches, marble
pillars, and warm lantern light. Mood: majestic royal portrait,
painterly warm lighting.
```

### 2. Mehandi Garden — Solo / Couple / Group
```
Dress the subjects in fresh festive mehandi-ceremony attire in sage
green, lemon yellow, and blush pink: flowy anarkalis or lehengas with
floral gota-patti work for women, pastel kurtas with Nehru jackets for
men, floral jewellery (genda phool garlands, flower bracelets).
Background: a daytime garden mehandi setup with marigold strings,
hanging floral umbrellas, brass lanterns, and a swing decorated with
flowers. Mood: bright, joyful, sun-drenched festive afternoon.
```

### 3. Sangeet Glam — Solo / Couple
```
Dress the subjects in glamorous sangeet-night party wear: shimmering
sequined saree or cocktail lehenga in midnight blue and silver for
women with statement chandelier earrings; a sharp embroidered bandhgala
or velvet blazer in deep wine for men. Background: a luxurious indoor
sangeet stage at night with warm fairy-light curtains, crystal
chandeliers, and soft bokeh. Mood: high-glam evening celebration,
cinematic warm-and-cool lighting.
```

### 4. Haldi Glow — Solo / Couple / Group
```
Dress the subjects in traditional haldi-ceremony yellow: simple elegant
yellow kurtas or sarees with white floral jewellery (jasmine and
mogra), light dupattas. Background: a sunlit courtyard haldi setup with
yellow and white drapes, marigold garlands, brass urli bowls with
floating flowers. Subtle festive turmeric-yellow color grading. Mood:
warm, playful, glowing morning ceremony.
```

### 5. South Indian Temple Classic — Solo / Couple
```
Dress the subjects in classic South Indian wedding attire: rich
kanjeevaram silk saree in deep maroon with broad gold zari border,
temple jewellery, gajra in the hair for women; cream silk veshti with
gold border, angavastram, and a simple gold chain for men. Background:
an ancient stone temple corridor with carved granite pillars and warm
oil-lamp light. Mood: timeless, devotional elegance, rich warm tones.
```

### 6. Vintage Mumbai Retro — Solo / Couple
```
Transform into a 1970s Indian retro film-poster style portrait: men in
a wide-collared patterned shirt with flared trousers and aviator
sunglasses tucked in the pocket; women in a chiffon polka-dot saree
with winged eyeliner, a rose in styled retro hair. Background: a
vintage city street with an old black-and-yellow taxi, hand-painted
signboards, and warm faded film grain. Mood: nostalgic retro glamour,
slightly desaturated 70s film color palette.
```

---

## UNIVERSAL / CORPORATE THEMES

### 7. Classic Studio B&W — Solo / Couple
```
Dress the subject in timeless formal wear: a tailored black suit with
white shirt, or an elegant black evening gown/saree. Background: plain
dark studio backdrop with a single dramatic key light from the side.
Convert to high-contrast black-and-white fine-art portrait with rich
tonal range. Mood: prestige magazine portrait, sharp and classic.
```

### 8. Executive Headshot Pro — Solo
```
Dress the subject in modern business attire: a well-fitted navy suit
with light shirt, or a formal blazer over an elegant top. Background:
softly blurred contemporary office with glass and warm wood tones,
shallow depth of field. Professional three-point lighting, confident
approachable look. Mood: premium corporate headshot for a company
website.
```

### 9. Cyber Neon Night — Solo / Couple
```
Dress the subjects in sleek futuristic streetwear: dark techwear
jackets with subtle glowing trim, modern minimal accessories.
Background: a rain-slicked neon-lit city street at night with cyan and
magenta signboards reflecting on wet pavement, light haze. Mood:
stylish futuristic night portrait, vivid neon rim lighting.
```

### 10. Royal Oil Painting — Solo / Couple
```
Transform into a classical oil-painting style royal portrait: subjects
in opulent vintage aristocratic attire — velvet coats with gold braid,
or rich silk gowns with pearl jewellery. Background: a stately study
with a heavy drape, globe, and gilded frame aesthetic, painted
brushstroke texture throughout while keeping faces clearly
recognizable. Mood: museum-quality classical portrait painting.
```

---

## FUN / KIDS / GROUP THEMES

### 11. Little Astronaut — Solo (kids)
```
Dress the child in a friendly white space suit with mission patches,
helmet held under one arm. Background: a colorful spaceship interior
window view of Earth, planets and soft stars, gentle cartoon-real
hybrid style that stays photorealistic on the face. Mood: wonder and
adventure, bright cheerful lighting.
```

### 12. Jungle Explorer — Solo (kids) / Group
```
Dress the subjects in khaki explorer outfits with safari hats and
binoculars around the neck. Background: a lush sunlit jungle clearing
with giant leaves, a friendly parrot on a branch, and soft rays of
light through the canopy. Mood: storybook adventure, warm green
tones, family-friendly.
```

### 13. Cricket Star — Solo (any age)
```
Dress the subject in a generic professional cricket uniform in plain
royal blue with no team logos or sponsor marks, holding a cricket bat,
stadium floodlights behind. Background: a packed cricket stadium at
night with dramatic light and shallow crowd bokeh. Mood: heroic sports
poster, confident champion energy. Do not include any real team names,
logos, or branding.
```

### 14. Bollywood Retro Poster — Group (3+)
```
Transform the group into a dramatic vintage Indian movie-poster style
composition: everyone in coordinated 1980s formal retro outfits, posed
like an ensemble film cast. Background: hand-painted poster art style
sky in orange and teal with bold empty space at the top for a title.
Keep all faces photorealistic and recognizable. Mood: fun dramatic
retro poster. Do not reference any real film, actor, or title.
```

### 15. Monsoon Romance — Couple
```
Dress the couple in elegant rain-evening attire: a dark suit for him,
a flowing teal saree for her, sharing a large black umbrella.
Background: a charming old-town street in soft rain at dusk, glowing
street lamps, reflections on cobblestones, light mist. Mood: cinematic
romantic rain scene, cool tones with warm lamp highlights.
```

---

## Testing checklist (per preset, in Google AI Studio)

1. Test with: bright photo, dim photo, glasses, smiling vs neutral, child photo (for kids themes), and a couple/group shot for multi-person tags.
2. Fail criteria: face changed, skin tone shifted, extra/missing people, attire revealing, brand or text artifacts appearing.
3. If faces drift → strengthen the opening line ("Preserve the face EXACTLY; this is the most important rule") and reduce style-transfer language like "transform" in favor of "dress the subject in…".
4. If output looks flat → add one lighting sentence; lighting language moves quality more than adjectives do.
5. Lock the final wording, generate the thumbnail for the preset card from your best test result, and record both in a sheet: preset name | people tag | final prompt | thumbnail file.

## Notes

- All themes here are original concepts — keep it that way. If you add presets later, avoid film titles, character names, sports teams, fashion brands, and celebrity references both in prompts and preset names.
- The people tag matters: solo prompts on group photos confuse the model. Tag presets `solo / couple / group` in the DB exactly as listed and let the booth warn on mismatch (per Doc 03 edge cases).
