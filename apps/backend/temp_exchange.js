const axios = require('axios');

async function exchangeToken() {
  const url = 'https://graph.facebook.com/v22.0/oauth/access_token';
  const payload = {
    client_id: '1854232595195849',
    client_secret: '80d251c2f203d6bcc3585620963849dc', // From .env
    code: 'AQCvsCgL80iHjKy8hZxBC3fHj7UM0MDTqhfFjtfcgkFhKHUQ3NDOWFEhayD_pL0jBmYuGKiLJCY6NVNduUZmGC33vOkTrk1veFq-j31sMHwUFpLhmHNatKq_fd7OpTkaSuF0QgjaGXWbK_oE21wRA7-QxZ48ULwsYnGEkDrUMxM9gOkD13fgTlFDYpLF5iPnL8ib8Lc3OPtI7uRSKKJDeVNuEyNlEHAfg083fk39x9TAB-BjOx4SV4YRyk3pfG-vBJnFYEoU9BKCmyGrOJvQU3K3RehGOorU1YV-V-PnbdTFf3xdvsCDyaZoOSo373IdS0vvj7GUrgpG8hNEcDJJYgKGFq2nGZs0bSHdUEAbcBRntEM5O037DkokDJUnK1yejXpgVhWFE1_Z_7QAis7GvhnKtDoHbgLFISvgsUbERUjfXmCg53p2BaAa3ucaVY-70Dc',
    grant_type: 'authorization_code',
    redirect_uri: 'https://developers.facebook.com/es/oauth/callback/?use_case_enum=WHATSAPP_BUSINESS_MESSAGING&selected_tab=es-integration&product_route=whatsapp-business&business_id=908120788398554&nonce=AvuqRbSGVFuGNy7snM5OJlXsDVoiIo1O'
  };

  try {
    console.log('Exchanging token...');
    const response = await axios.post(url, payload);
    console.log('Success! Access Token Response:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error exchanging token:');
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

exchangeToken();
