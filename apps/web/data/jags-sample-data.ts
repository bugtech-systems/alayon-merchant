// lib/data/jags-sample-data.ts

export const sampleJagsData = {
  // Own Brand Jags (your company's branded containers)
  ownBrand: {
    inCirculation: 450,    // Total own brand jags currently in the field
    borrowed: 320,         // Currently borrowed by customers
    returned: 280,         // Returned this period (day/week/month)
    lost: 12,              // Reported lost or damaged
  },

  // Other Brand Jags (competitor/other company containers)
  otherBrand: {
    inCirculation: 180,    // Total other brand jags being tracked
    borrowed: 150,         // Currently borrowed by customers  
    returned: 120,         // Returned this period
    lost: 8,               // Reported lost or damaged
  },

  // No Brand Jags (unbranded/generic containers)
  noBrand: {
    inCirculation: 75,     // Total unbranded jags in the field
    borrowed: 60,          // Currently borrowed by customers
    returned: 45,          // Returned this period
    lost: 5,               // Reported lost or damaged
  },

  // Aggregate totals
  totalBorrowed: 530,      // Sum of all currently borrowed jags (320 + 150 + 60)
  totalReturned: 445,      // Sum of all returned jags this period (280 + 120 + 45)
  outstanding: 85,         // borrowed - returned = jags still out (530 - 445)
  overdue: 15,             // Jags past their expected return date
};

// Type definition for the data
export interface JagsData {
  ownBrand: {
    inCirculation: number;
    borrowed: number;
    returned: number;
    lost: number;
  };
  otherBrand: {
    inCirculation: number;
    borrowed: number;
    returned: number;
    lost: number;
  };
  noBrand: {
    inCirculation: number;
    borrowed: number;
    returned: number;
    lost: number;
  };
  totalBorrowed: number;
  totalReturned: number;
  outstanding: number;
  overdue: number;
}

// Different scenario data sets for testing/development

// Scenario 1: Normal operations
export const normalJagsData: JagsData = {
  ownBrand: {
    inCirculation: 450,
    borrowed: 320,
    returned: 280,
    lost: 12,
  },
  otherBrand: {
    inCirculation: 180,
    borrowed: 150,
    returned: 120,
    lost: 8,
  },
  noBrand: {
    inCirculation: 75,
    borrowed: 60,
    returned: 45,
    lost: 5,
  },
  totalBorrowed: 530,
  totalReturned: 445,
  outstanding: 85,
  overdue: 15,
};

// Scenario 2: High volume day
export const highVolumeJagsData: JagsData = {
  ownBrand: {
    inCirculation: 850,
    borrowed: 600,
    returned: 450,
    lost: 25,
  },
  otherBrand: {
    inCirculation: 320,
    borrowed: 280,
    returned: 200,
    lost: 15,
  },
  noBrand: {
    inCirculation: 150,
    borrowed: 120,
    returned: 80,
    lost: 10,
  },
  totalBorrowed: 1000,
  totalReturned: 730,
  outstanding: 270,
  overdue: 45,
};

// Scenario 3: Low activity / new business
export const lowVolumeJagsData: JagsData = {
  ownBrand: {
    inCirculation: 100,
    borrowed: 50,
    returned: 45,
    lost: 2,
  },
  otherBrand: {
    inCirculation: 30,
    borrowed: 20,
    returned: 15,
    lost: 1,
  },
  noBrand: {
    inCirculation: 15,
    borrowed: 10,
    returned: 8,
    lost: 0,
  },
  totalBorrowed: 80,
  totalReturned: 68,
  outstanding: 12,
  overdue: 3,
};

// Scenario 4: Problem scenario - many overdue
export const problemJagsData: JagsData = {
  ownBrand: {
    inCirculation: 500,
    borrowed: 400,
    returned: 200,
    lost: 50,
  },
  otherBrand: {
    inCirculation: 200,
    borrowed: 180,
    returned: 80,
    lost: 30,
  },
  noBrand: {
    inCirculation: 100,
    borrowed: 90,
    returned: 40,
    lost: 20,
  },
  totalBorrowed: 670,
  totalReturned: 320,
  outstanding: 350,
  overdue: 150,
};

// Scenario 5: Empty state (no data)
export const emptyJagsData: JagsData = {
  ownBrand: {
    inCirculation: 0,
    borrowed: 0,
    returned: 0,
    lost: 0,
  },
  otherBrand: {
    inCirculation: 0,
    borrowed: 0,
    returned: 0,
    lost: 0,
  },
  noBrand: {
    inCirculation: 0,
    borrowed: 0,
    returned: 0,
    lost: 0,
  },
  totalBorrowed: 0,
  totalReturned: 0,
  outstanding: 0,
  overdue: 0,
};

// Helper function to calculate derived values
export function calculateJagsData(rawData: {
  ownBrandBorrowed: number;
  ownBrandReturned: number;
  ownBrandLost: number;
  otherBrandBorrowed: number;
  otherBrandReturned: number;
  otherBrandLost: number;
  noBrandBorrowed: number;
  noBrandReturned: number;
  noBrandLost: number;
  overdue: number;
}): JagsData {
  const ownBrandInCirculation = rawData.ownBrandBorrowed + rawData.ownBrandReturned + rawData.ownBrandLost;
  const otherBrandInCirculation = rawData.otherBrandBorrowed + rawData.otherBrandReturned + rawData.otherBrandLost;
  const noBrandInCirculation = rawData.noBrandBorrowed + rawData.noBrandReturned + rawData.noBrandLost;
  
  const totalBorrowed = rawData.ownBrandBorrowed + rawData.otherBrandBorrowed + rawData.noBrandBorrowed;
  const totalReturned = rawData.ownBrandReturned + rawData.otherBrandReturned + rawData.noBrandReturned;
  
  return {
    ownBrand: {
      inCirculation: ownBrandInCirculation,
      borrowed: rawData.ownBrandBorrowed,
      returned: rawData.ownBrandReturned,
      lost: rawData.ownBrandLost,
    },
    otherBrand: {
      inCirculation: otherBrandInCirculation,
      borrowed: rawData.otherBrandBorrowed,
      returned: rawData.otherBrandReturned,
      lost: rawData.otherBrandLost,
    },
    noBrand: {
      inCirculation: noBrandInCirculation,
      borrowed: rawData.noBrandBorrowed,
      returned: rawData.noBrandReturned,
      lost: rawData.noBrandLost,
    },
    totalBorrowed,
    totalReturned,
    outstanding: totalBorrowed - totalReturned,
    overdue: rawData.overdue,
  };
}