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
    mapQuery: "B.R. Birla Public School, R.K. Nagar, Jodhpur, Rajasthan 342008"
  },
  mapEmbed: null,                             // PLACEHOLDER exact Google Maps embed URL (verify the pin)

  hours: null,                                // PLACEHOLDER e.g. [["Mon–Sat","10:00 AM – 8:00 PM"],["Sunday","Closed"]]
  serviceArea: "Jodhpur, with projects across Rajasthan",

  social: {                                   // PLACEHOLDER: add URLs when available
    facebook: null, instagram: null, youtube: null, linkedin: null
  },
  indiamart: "https://www.indiamart.com/yamini-enterprises-jodhpur/",

  // All images live in images/ at the repo root (served by GitHub Pages).
  imgBase: "images/",

  // true = highlight every placeholder (for review). Set false before going live.
  showPlaceholderHints: true
};
