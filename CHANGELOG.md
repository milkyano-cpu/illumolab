# iilumolab update log

Every change to the iilumolab redesign, newest first. Live concept: https://illumolab.steroidsdigital.com.au

## Sat 07 Nov 2026

- **16:37** Checkout also shows the one-time offer first, then the checkout card
- **16:36** Real service prices from their pages (Quote where none listed), Saturday 10am to 2pm on Contact, fuller FAQ
- **16:31** All other pages in the new design: About, Contact, FAQ, Careers, 13 service pages, DIXCEL guide, wheel-wrap car search, 5 policies (#/pages/<shopify handle>); footer and menu link to them
- **16:24** Header search, Book install and My garage share one 40px height and text size
- **16:20** @iilumolab heading links to Instagram
- **16:19** In-sentence phone links read "our team" (still tap to call)
- **16:16** Slider is now Parts | Services (their own menu split); removed fitting add-ons since the lab fits every part
- **16:12** Phones: build panel buttons stack, Book this build on top
- **16:12** One-time offer step before booking (3 discounted add-ons, 3 min countdown), sticky one-row category chips, sold-out parts flip to Pre-order (Shopify inventory fields), You may also like with quick Add to build
- **16:05** Build panel: Checkout + Book this build, both ending at one checkout card (booking details ride along); phones show products 2 across; header search (bar on desktop, magnifier on phones)
- **15:59** Slider is now Delivered | Fitted by us: fitted shows fitting price on each part, adds fitting with the part, and lists services; removed the line above the slider
- **15:54** Parts/Installs toggle now changes the line above it and the Search button, so the switch is obvious before a car is picked

## Sat 31 Oct 2026

- **22:54** Hero height locked at load: mobile toolbar collapse no longer resizes the hero (zoom/jump while scrolling)
- **22:29** Smooth scrolling: no hero zoom anywhere, brand logos stored at display size, small header logo, loops pause while touch-scrolling
- **22:23** Phones: vertical swipes on the 360 car scroll the page (no rotate), intro spin only when visible, fewer root restyles on iOS resize
- **22:18** Phones: no live backdrop blur, fade-only reveals, no card layer promotion (smooth scrolling)
- **22:16** Mobile: no hero zoom or scroll parallax on phones (stuttered while scrolling)
- **22:08** Mobile: no sideways panning in popups (iOS date input), smooth 360 parts panel, Directions aligned
- **21:41** Build bar close: fold into a tall capsule with ease-in-out, then drop
- **21:40** Build bar reveal: slower ease-in-out (760ms), smoother bounce
- **21:39** Add to build: GPU-only orb flight, all DOM work before takeoff, clean reveal on landing

## Fri 30 Oct 2026

- **13:41** Build bar: reveal contents with the growing pill (no fade); exact-pixel clip so phones animate
- **13:40** iilumolab redesign: client-approved prototype

## Shopify theme (draft "iilumolab on Steroids", live site untouched)

- **10%**: design foundations (colours, fonts, buttons) and the Home hero, editable in the theme editor.
- **30%**: six more home sections, all editable with plain-English names: Brand logo strip, Services tiles, Brands we fit, Our lab story, Visit the lab (Open now badge, today's hours), Book in three steps. Checked on desktop and phone.
- **35%** (14 Nov): Popular parts (real products, automatic In stock / Pre-order / Sold out, adds to the cart drawer) and the iilumo Club signup (Shopify's customer form).
- **55%** (14 Nov): header restyled with a Book install button (their menu app kept working), footer restyled, every content page (About, Contact, Careers, policies, services) in the redesign's page layout with sentence-case titles, a new "service" page template, product cards restyled site-wide with stock badges, collection pages restyled, light grey page background.
- Zero Offset kept out of everything we designed (concept All parts, Shopify Popular parts has an "Only show these brands" setting: iilumo, ADRO). Podium chat button recoloured to the brand on the draft (editable in Theme settings).
- **67%** (14 Nov): product page restyled with four new editable blocks: stock badge, Book the install button, iilumo Club card, You may also like (related iilumo/ADRO parts with quick Add to build).
- **85%** (19 Nov): the "My build" bar on every page (the cart as a floating pill: parts list, remove, Checkout, Book this build), the add-to-build orb that flies into it, the one-time offer before checkout and before booking (3 parts picked in Theme settings, real stock "Only N left", a discount and timer only once a real discount code is set), and the Book this build step (car, preferred day, phone saved on the order for the lab). Also shows before Impact's own cart drawer checkout. Checked on phone and desktop.
- **100%** (20 Nov): vehicle finder on the home page (pick the make, then the car, land on that car's parts; uses the 89 car collections from the Vehicles menu, empty ones hide themselves; the car is remembered), "Find parts for my car" and "Shop by vehicle" glide to it; the product page button now says "Add to build" and the build bar answers it; fixed an old app error in the theme's cart code. Final checks: every page type loads with no errors (home, collections, products, content pages, cart, search, blog, policies, 404), phone and desktop, theme check and the human-touch check clean.
- **Rebuilt on the approved design** (20 Nov): the draft now runs the approved site itself (its own stylesheet and script, every section editable in the theme editor), wired to the real store: finder with make / model / year, 360 view and parts grid, live product pop-up and product pages, All parts for every collection and search, content pages, My build to the real Shopify checkout, booking requests to the store inbox, Club and newsletter signups as Shopify customers. Stock shown as the iilumo light bar. Chat button amber.
- **Still to finish**: one-time offer discount (needs a real discount code or no % off), live prices on cards, cart page, 404, blog and the Ghost / DriveVision landing pages on the new design.
- **Before going live (in Shopify admin)**: create the FAQ page; fix the 19 empty car collections (e.g. GR86, GR Supra, GR Corolla) so they show in the finder; give the 13 service pages the "service" template on publish day; optional: a discount code for the one-time offer, a Best sellers collection for Popular parts.
