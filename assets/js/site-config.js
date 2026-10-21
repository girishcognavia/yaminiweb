/* =====================================================================
   SITE CONFIG: the one place to update company details.
   Any value set to null renders as a visible [PLACEHOLDER] on the site.
   Source: company-data/company-data.md (IndiaMART + Helplinesearch, Oct 2026)
   ===================================================================== */
window.SITE = {
  name: "Yamini Enterprises",
  tradeName: "Hitachi Studio",
  tagline: null,                              // PLACEHOLDER e.g. "Hitachi's Preferred Channel Partner in Jodhpur"
  established: 2009,
  owner: "Pradeep Kumar Sharma",
  ownerTitle: "Founder & Proprietor",
  ownerPhoto: null,                           // PLACEHOLDER path relative to imgBase, e.g. "team/owner.jpg"
  logo: null,                                 // PLACEHOLDER path relative to imgBase; null = text logo
  team: "11 to 25 people",
  gst: "08BCRPS3912F1ZA",
  legal: "Proprietorship",
  business: "Wholesaler, Distributor & Retailer",

  phone: { display: "+91 94141 00877", tel: "+919414100877" },
  landlines: [
    { display: "0291-2610808", tel: "+912912610808" },
    { display: "0291-2634372", tel: "+912912634372" }
  ],
  whatsapp: "919414100877",                   // CONFIRM with client: assumed same as mobile
  email: "pksharmajodhpur@gmail.com",

  address: {
    line1: "Anand Mangal Building, Old Loco Shed Road",
    line2: "Ratanada, Jodhpur, Rajasthan 342001",
    mapQuery: "Anand Mangal Building, Old Loco Shed Road, Ratanada, Jodhpur, Rajasthan 342001"
  },
  mapEmbed: null,                             // PLACEHOLDER exact Google Maps embed URL (verify the pin)

  hours: null,                                // PLACEHOLDER e.g. [["Mon–Sat","10:00 AM – 8:00 PM"],["Sunday","Closed"]]
  serviceArea: null,                          // PLACEHOLDER e.g. "Jodhpur & Western Rajasthan"

  social: {                                   // PLACEHOLDER: add URLs when available
    facebook: null, instagram: null, youtube: null, linkedin: null
  },
  indiamart: "https://www.indiamart.com/yamini-enterprises-jodhpur/",

  rating: { value: 3.0, count: 2, source: "IndiaMART" },

  // website/images is a link to company-data/images, so images only need replacing once.
  imgBase: "images/",

  // true = highlight every placeholder (for review). Set false before going live.
  showPlaceholderHints: true
};
