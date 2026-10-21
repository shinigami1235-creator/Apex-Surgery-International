# Revision 1: Gid's review of the live preview (21 Oct 2026)

Gid reviewed https://shinigami1235-creator.github.io/Apex-Surgery-International/en/ and sent screenshots with the notes below. His examples are only examples. **Find every other place with the same kind of problem and fix those as well.** He also wants us to reuse anything good from the group's main Apex site (see `/home/claude/apex-surgery/_ref/main-site/`: its data files, page renderers and home renderer).

## His notes, grouped by owner

### Pages (site shell, CSS, page templates)

1. **Abrupt section changes.** The cut from the dark hero to the white "About Apex Surgery" section is too sudden. Sections feel cut off from each other everywhere. Use smooth transitions between section colours (gradient blends, soft fades or shaped dividers) and keep the motion on scroll.
2. **Boxes are too plain.** The consultation form's photo boxes (front, 45 degrees, profile) are dashed boxes with a cartoon icon, and he wants them to "pop". The same goes for plain cards anywhere on the site. Use depth, layered gradients, texture and hover/press motion.
3. **Branches.** Make them look better and more interactive. Ideas:
   - an embedded Google Map per branch (iframe embed by address, loaded lazily);
   - a switch between the two branches;
   - a photo with parallax or zoom;
   - call, LINE and map actions;
   - the address with a copy action.
4. **Testimonials and stories.** He loves the review image rail and the video stories viewer. Keep them.
5. **Long texts.** Be more creative with reviews and long texts (articles, review posts, service sections):
   - add pictures from the client's site, or from Unsplash where the site has none;
   - use pull quotes, key-fact cards, side images, numbered steps and drop-in highlights;
   - avoid walls of text.
6. **Service text layout looks bad.** Improve the layout and display of the service sections ("who it suits", technique lists and so on). Use structured cards, icons, two-column splits and images.
7. **Q&A overflow.** The big "Q&A: breast augmentation program" heading bleeds into the FAQ column. Fix the layout so long headings never overlap. Check every heading/column pair on every page at 1440, 1024, 768 and 375 widths.
8. **Dr. Nantapat Supapannachart (founder).** Use her photos and bio from the main Apex site:
   - `_ref/main-site/doctors.js` and `about.js`;
   - images such as `~/wp-content/uploads/2024/11/dr-nantapat-supapannachart-ceo.webp` and `~/wp-content/uploads/2025/01/CEO-Dr.Nantapat-Supapannachart.webp`. These paths are relative to https://www.apexmedicalcenter.co.th/, not the surgery site.
9. **Facebook page.** Embed it in a window: the Facebook page plugin for https://www.facebook.com/apexsurgerythailand, with timeline tabs. The main site's `core.js` has an `fbFrame` / `fbMount` helper. Put it on the home page and on the reviews page.
10. **Main-site borrowings.** Reuse what fits from the main site, for example the AACI accreditation badge, which names "APEX Surgery Hospital Ploenchit".
11. **Hero chips.** The six procedure chips under the hero CTAs look faint. Make them readable.

### Body map (features/bodymap)

12. **Head shape.** The 3D head in the face zoom looks too square.
    - The female head needs a more elegant shape: softer, tapered jaw, V-line chin.
    - The male head needs a sharper look: defined jaw angle, stronger chin and brow.
13. **Mouth highlight.** The glowing lip lines on the face make it look like a man opening his mouth wide. Remove or tone down the mouth/lip highlight so the mouth reads as closed and calm.
14. **Particle texture.** Make the particles look premium: depth, rim light and subtle colour variation.
15. **Stage edges.** The body map stage has hard rectangular edges, and the area chips sit on its bottom edge. Feather the stage into the hero background so there is no visible box.

### Games (features/games)

16. **Proportion face.** The drawing is awkward. Use Gid's own clinic face stencils (traced line art):
    - `_ref/stencils/cygnus-face.js`, an SVG path string per view on a 600x800 canvas: `FACE_FRONT`, `FACE_SIDE`, `FACE_45`;
    - the master images `_ref/stencils/front.jpg`, `side-left.png` and `45-left.png`.
17. **Other games are bland.** The concepts are good while the presentation is not. He wants textures, layers, designs and animation, plus music that can be toggled on and off.
18. **Steady Hand.** The stitch looks like a worm.
19. **Alignment.** Text in the boxes is not aligned properly.
20. **Cards.** The cards are too plain.

### Nose preview (features/nose)

21. **Asian sample faces.** Add sample faces for all three views. These were picked and checked by eye:
    - Front: `https://images.unsplash.com/photo-1589525231707-f2de2428f59c` (Vietnamese woman facing camera, wide landscape frame; crop to the face, e.g. `?w=1200&h=1500&fit=crop&crop=faces&q=85`).
    - 45 degrees: `https://images.unsplash.com/photo-1641351841616-faa0d3760980` (East Asian woman, head turned about 35 to 45 degrees, black and white).
    - Profile: `https://images.unsplash.com/photo-1736439538470-88b66bd307ce` (East Asian woman in profile facing left, sky background; crop to the head).

## Rules that still apply

`/home/claude/apex-surgery/BRIEF.md` still applies in full: design tokens, no arch shapes, writing rules for every visible string, both languages, 375px to desktop, and reduced motion.
