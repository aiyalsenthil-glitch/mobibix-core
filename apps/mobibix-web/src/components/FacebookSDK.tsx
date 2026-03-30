"use client";

import Script from "next/script";

const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

// Declare the window interface to avoid TS errors
declare global {
  interface Window {
    fbAsyncInit: () => void;
  }
  // eslint-disable-next-line no-var
  var FB: any;
}

export default function FacebookSDK() {
  if (!FACEBOOK_APP_ID) return null;

  return (
    <>
      <Script
        id="facebook-jssdk-init"
        strategy="afterInteractive"
      >
        {`
          window.fbAsyncInit = function() {
            FB.init({
              appId      : '${FACEBOOK_APP_ID}',
              cookie     : true,
              xfbml      : true,
              version    : 'v19.0'
            });
            FB.AppEvents.logPageView();   
          };
        `}
      </Script>
      <Script
        id="facebook-jssdk"
        strategy="afterInteractive"
        src="https://connect.facebook.net/en_US/sdk.js"
      />
    </>
  );
}
