let realDate;
/* eslint-disable no-undef */

// These helpers are only used in test files.
const overrideDate = () => {
  realDate = Date;

  const mockedDateString = "2000-01-01T10:10:10.100Z";
  const currentDate = new Date(mockedDateString);

  global.Date = class extends Date {
    constructor(year, month, day) {
      if (year >= 0 && month >= 0 && day >= 0) {
        return new realDate(year, month, day);
      }

      return currentDate;
    }
  };
};

const restoreDate = () => {
  global.Date = realDate;
};

export { overrideDate, restoreDate };
