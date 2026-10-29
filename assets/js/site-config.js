/* =====================================================================
   SITE CONFIG: the one place to update company details.
   Any value set to null renders as a visible [PLACEHOLDER] on the site.
   Source: company details supplied by Yamini Enterprises (Oct 2026), plus
   contact/GST details from company-data/company-data.md
   ===================================================================== */
window.SITE = {
  name: "Yamini Enterprises",
  tagline: "Exclusive Dealers and Service Providers for Hitachi HVAC Solutions by Bosch Home Comfort Group in Jodhpur",
  brandPartner: "Hitachi HVAC Solutions by Bosch Home Comfort Group",
  overview: "Established in 2009, Yamini Enterprises specializes in Hitachi HVAC products and services, primarily serving Jodhpur, with project operations extending across Rajasthan. We are committed to providing reliable air-conditioning solutions for a wide range of applications.",
  industry: "Heating, Ventilation, and Air Conditioning (HVAC)",
  category: "HVAC Equipment Supplier, Air Conditioning Systems Dealer & Service Provider",
  authorisation: "Authorised Sale & Service Dealer: Hitachi Air Conditioners",   // letterhead
  certification: "An ISO 9002 Certified Company",                                // letterhead
  partnerLogo: "brand/bosch-hitachi.png",     // Bosch | HITACHI Cooling and Heating (footer)
  established: 2009,
  owner: "Pradeep Sharma",
  ownerTitle: "Founder & Proprietor",
  ownerPhoto: null,                           // optional: path relative to imgBase, e.g. "team/owner.jpg"
  logo: "brand/logo.png",                     // round emblem (from company-data/images/company logo/)
  wordmark: "brand/wordmark.png",             // "Yamini Enterprises" text image, background cleaned
  headerLine: "Hitachi HVAC Solutions",       // red line under the wordmark in the header
  team: "11 to 25 people",
  gst: "08BCRPS3912F1ZA",
  legal: "Proprietorship",

  phone: { display: "+91 94141 00877", tel: "+919414100877" },        // primary mobile (letterhead)
  phones: [
    { display: "+91 94141 00877", tel: "+919414100877" },
    { display: "+91 63757 75857", tel: "+916375775857" }
  ],
  whatsapp: "919414100877",                   // CONFIRM with client: assumed same as mobile
  email: "pksharmajodhpur@gmail.com",

  address: {                                  // from company letterhead (Oct 2026)
    line1: "134, R.K. Nagar, Opp. B.R. Birla Public School",
    line2: "Jodhpur, Rajasthan 342008",
    area: "R.K. Nagar, Jodhpur",
    // Google can't geocode the full letterhead address, so maps pin the landmark it names
    // ("Opp. B.R. Birla Public School"). Replace with the shop's own pin via mapEmbed when available.
    mapQuery: "B.R. Birla Public School, Jodhpur"
  },
  mapEmbed: null,                             // optional: exact Google Maps embed URL (Share → Embed a map → copy the src). null = search by address

  hours: null,                                // PLACEHOLDER e.g. [["Mon–Sat","10:00 AM – 8:00 PM"],["Sunday","Closed"]]
  serviceArea: "Jodhpur, with projects across Rajasthan",

  social: {                                   // PLACEHOLDER: add URLs when available
    facebook: null, instagram: null, youtube: null, linkedin: null
  },
  indiamart: "https://www.indiamart.com/yamini-enterprises-jodhpur/",

  /* Home page "Who we are" carousel. Each card flips open to show details.
     To add a real project: copy an entry, set photo: true for a photograph
     (fills the card) or false for a product image (shown on a light panel). */
  works: [
    { tag: "Residential", title: "Homes", place: "Jodhpur", photo: false,
      img: "products/inverter-split-acs/hitachi-kashikoi-5300fx-inverter-split-acs.jpg",
      text: "Air-conditioning for homeowners, from a single room to the whole house: quiet, efficient comfort for Jodhpur's summers.",
      systems: ["Inverter split ACs", "Fixed speed split ACs", "Window ACs"], cat: "inverter-split-acs" },
    { tag: "Showroom", title: "See it before you buy", place: "Jodhpur", photo: true,
      img: "gallery/showroom-6.png",
      text: "Compare Hitachi models side by side at our showroom, with advice from a team that has specialised in HVAC since 2009.",
      systems: ["Live split AC display", "Product demos", "Expert advice"], cat: "" },
    { tag: "Commercial", title: "Offices & commercial buildings", place: "Jodhpur & Rajasthan", photo: false,
      img: "products/light-commercial-air-conditioners/hitachi-r410a-inverter-series-cassette-air-conditioner.jpg",
      text: "Even cooling across cabins, open floors and common areas, with ceiling cassettes, concealed units and zoned central systems.",
      systems: ["Cassette ACs", "Concealed splits", "VRF systems"], cat: "light-commercial-air-conditioners" },
    { tag: "Hospitality", title: "Hotels & resorts", place: "Across Rajasthan", photo: false,
      img: "products/ductable-air-conditioners/hitachi-toushi-series-5-5tr-r410a-ductable-air-conditioner.jpg",
      text: "Individual comfort for every guest room and high-capacity cooling for lobbies, banquet halls and restaurants.",
      systems: ["Ductable ACs", "VRF systems", "Cassette ACs"], cat: "ductable-air-conditioners" },
    { tag: "Our team", title: "Installation & after-sales service", place: "Jodhpur", photo: true,
      img: "gallery/showroom-3.png",
      text: "As exclusive dealers and service providers, we support every system we supply, from installation to maintenance and repairs.",
      systems: ["Installation", "Annual maintenance (AMC)", "Repairs"], cat: "" },
    { tag: "Healthcare", title: "Hospitals", place: "Across Rajasthan", photo: false,
      img: "products/vrf-systems/hitachi-set-free-sigma-ras-8-0hnbcmq1-8-hp-vrf-system.jpg",
      text: "Reliable, round-the-clock cooling for wards, operation theatres and diagnostic areas.",
      systems: ["VRF systems", "Chillers", "Ductable ACs"], cat: "vrf-systems" },
    { tag: "Industrial", title: "Industrial facilities", place: "Across Rajasthan", photo: false,
      img: "products/hitachi-chillers/hitachi-air-cooled-screw-chillers.jpg",
      text: "Plant-scale chillers and central systems for large, demanding sites.",
      systems: ["Air-cooled screw chillers", "Water-cooled chillers", "Central plants"], cat: "hitachi-chillers" },
    { tag: "Showroom", title: "The latest Hitachi range", place: "Jodhpur", photo: true,
      img: "helplinesearch/helplinesearch-2.jpg",
      text: "100+ Hitachi models across 8 categories, with the current range on display and in stock.",
      systems: ["Split & window ACs", "Commercial units", "Hitachi refrigerators"], cat: "" },
    { tag: "Institutional", title: "Institutions", place: "Jodhpur & Rajasthan", photo: false,
      img: "products/fixed-speed-split-acs/hitachi-zunoh-3100f-1-5tr-fixed-speed-split-acs.jpg",
      text: "Solutions for institutional requirements of all sizes, from individual rooms to complete campuses.",
      systems: ["Split ACs", "Ductable ACs", "VRF systems"], cat: "fixed-speed-split-acs" }
  ],

  // All images live in images/ at the repo root (served by GitHub Pages).
  imgBase: "images/",

  // true = highlight every placeholder (for review). Set false before going live.
  showPlaceholderHints: true
};
