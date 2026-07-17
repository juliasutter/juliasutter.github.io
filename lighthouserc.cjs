module.exports = {
  ci: {
    collect: {
      staticDistDir: ".",
      url: ["http://localhost/", "http://localhost/en/"],
      numberOfRuns: 3,
      settings: {
        chromeFlags: "--headless=new --no-sandbox --disable-gpu --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows",
        formFactor: "mobile",
        screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 1, disabled: false }
      }
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 1 }],
        "categories:best-practices": ["error", { minScore: 1 }],
        "categories:seo": ["error", { minScore: 1 }]
      }
    },
    upload: { target: "filesystem", outputDir: "./artifacts/lighthouse" }
  }
};
