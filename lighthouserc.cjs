module.exports = {
  ci: {
    collect: {
      url: [
        process.env.LHCI_SITE_URL ? `${process.env.LHCI_SITE_URL}/` : "http://localhost:3000/",
        process.env.LHCI_SITE_URL
          ? `${process.env.LHCI_SITE_URL}/properties/commercial`
          : "http://localhost:3000/properties/commercial",
        process.env.LHCI_SITE_URL ? `${process.env.LHCI_SITE_URL}/about` : "http://localhost:3000/about",
        process.env.LHCI_SITE_URL ? `${process.env.LHCI_SITE_URL}/contact` : "http://localhost:3000/contact",
      ],
      numberOfRuns: 1,
      settings: {
        preset: "desktop",
        chromeFlags: "--no-sandbox --headless=new",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.95 }],
        "categories:accessibility": ["error", { minScore: 1 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 1800 }],
        "cumulative-layout-shift": ["warn", { maxNumericValue: 0.05 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
