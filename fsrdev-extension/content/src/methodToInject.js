/* global FSR */
const methodToInject = {
  "clearState": {
    "label": "clearState",
    "func": () => {
      setTimeout(() => {
        console.log("~~~~~~~~~~State is Cleared~~~~~~~~~~~~~~~");
        console.log("         FSR State Cleared               ");
        FSR.clearState();
        console.log("~%~%~%~%~%~%~%~%~%~%~%~%~%~%~%~%~%~%~%~%~");
      }, 3000);
    }
  },
  "call FSR Test": {
    "func": () => {
      setTimeout(() => {
        console.log("~~~~~~~~~~~~~~FSR Test~~~~~~~~~~~~~~~~~");
        console.log("         Calling page Test             ");
        FSR.test();
        console.log("~%~%~%~%~%~%~%~%~%~%~%~%~%~%~%~%~%~%~%~");
      }, 3000);
    }
  },
  "Reset The Page": {
    "value": 3,
    "func": () => {
      setTimeout(() => {
        console.log("~~~~~~~~~~Page Reset~~~~~~~~~~~~~~~~~~");
        console.log("       Calling page reset             ");
        FSR.pageReset();
        console.log("~%~%~%~%~%~%~%~%~%~%~%~%~%~%~~%~%~%~%~");
      }, 3000);
    }
  },
  "Total Page View": {
    "func": () => {
      setTimeout(() => {
        console.log("About to show page views");
        FSR.Storage.get("pv", (x) => {
          console.log("~~~~~~~~~~Page Views~~~~~~~~~~~~~~~~~~~~~");
          console.log("The current page view count is: ", x);
          console.log("~%~%~%~%~%~%~%~%~%~%~%~%~%~%~%~%~%~%~%~%~");
        });
      }, 3000);
    }
  },
  "Show Invite": {
    "label": "Show Invite",
    "value": 5,
    "func": () => {
      setTimeout(() => {
        console.log("~~~~~~~~~~Show Invite~~~~~~~~~~~");
        console.log("       Calling Show Invite      ");
        FSR.showInvite();
        console.log("~%~%~%~%~%~%~%~%~%~~%~%~%~%~%~%~");
      }, 3000);
    }
  }
};

export default methodToInject;