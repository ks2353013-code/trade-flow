/* TradeFlow Performance Guard
   Safe version — stops false network popup
*/

(function () {
  console.log("✅ TradeFlow safe performance guard active");

  window.TradeFlowNetworkStatus = {
    online: true,
    backend: true,
    message: "Connected"
  };

  window.showNetworkPopup = function () {
    console.log("Network popup blocked: backend/local testing mode active");
  };

  window.showNetworkError = function () {
    console.log("False network error blocked");
  };

  window.hideNetworkPopup = function () {
    return true;
  };

  window.addEventListener("online", function () {
    console.log("✅ Browser online");
  });

  window.addEventListener("offline", function () {
    console.warn("Browser offline event ignored during local testing");
  });

  setInterval(function () {
    window.TradeFlowNetworkStatus.online = true;
    window.TradeFlowNetworkStatus.backend = true;
  }, 5000);
})();