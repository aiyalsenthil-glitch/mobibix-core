<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gym Check-In</title>

    <style>
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        background: #f7f7f7;
        margin: 0;
        padding: 0;
      }

      .container {
        max-width: 420px;
        margin: 40px auto;
        background: #fff;
        padding: 24px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
      }

      h2 {
        text-align: center;
        margin-bottom: 20px;
      }

      input {
        width: 100%;
        padding: 12px;
        margin-top: 10px;
        font-size: 16px;
        border-radius: 6px;
        border: 1px solid #ccc;
      }

      button {
        width: 100%;
        padding: 14px;
        margin-top: 16px;
        font-size: 16px;
        border-radius: 8px;
        border: none;
        background: #111;
        color: #fff;
        cursor: pointer;
      }

      button:disabled {
        opacity: 0.6;
      }

      .error {
        color: red;
        font-size: 14px;
        margin-top: 8px;
      }

      .warning {
        margin-top: 10px;
        color: #b45309;
        background: #fef3c7;
        padding: 8px;
        border-radius: 6px;
        font-size: 14px;
      }

      .hidden {
        display: none;
      }

      .result {
        text-align: center;
        font-size: 18px;
      }
    </style>
  </head>

  <body>
    <div class="container">
      <h2>Gym Check-In</h2>

      <!-- STEP 1: PHONE -->
      <div id="stepPhone">
        <input
          id="phone"
          type="tel"
          placeholder="Enter phone number"
          maxlength="10"
        />
        <div id="phoneError" class="error"></div>
        <button onclick="lookup()">Continue</button>
      </div>

      <!-- STEP 2: CONFIRM -->
      <div id="stepConfirm" class="hidden">
        <p id="memberName"></p>
        <div id="paymentInfo"></div>
        <button id="confirmBtn" onclick="confirmAction()">Confirm</button>
      </div>

      <!-- STEP 3: RESULT -->
      <div id="stepResult" class="hidden result">
        <p id="resultMessage"></p>
      </div>
    </div>

    <script>
      // Extract tenant code from URL
      const tenantCode = window.location.pathname.split('/').pop();
      let memberId = null;

      async function lookup() {
        const phone = document.getElementById('phone').value;
        document.getElementById('phoneError').innerText = '';

        if (!phone) {
          document.getElementById('phoneError').innerText =
            'Please enter phone number';
          return;
        }

        try {
          const res = await fetch('/api/public/checkin/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantCode, phone }),
          });

          const data = await res.json();
          if (!res.ok) throw data;

          memberId = data.memberId;

          document.getElementById('stepPhone').classList.add('hidden');
          document.getElementById('stepConfirm').classList.remove('hidden');

          document.getElementById(
            'memberName'
          ).innerText = `Hi ${data.name} 👋`;

          if (data.paymentStatus === 'PARTIAL') {
            document.getElementById('paymentInfo').innerText =
              `⚠ Pending amount: ₹${data.pendingAmount}`;
            document.getElementById('paymentInfo').className = 'warning';
          } else {
            document.getElementById('paymentInfo').innerText = '';
          }

          document.getElementById('confirmBtn').innerText = data.isInside
            ? 'Check Out'
            : 'Check In';
        } catch (err) {
          document.getElementById('phoneError').innerText =
            err.message || 'Something went wrong';
        }
      }

      async function confirmAction() {
        try {
          const res = await fetch('/api/public/checkin/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantCode, memberId }),
          });

          const data = await res.json();
          if (!res.ok) throw data;

          document.getElementById('stepConfirm').classList.add('hidden');
          document.getElementById('stepResult').classList.remove('hidden');

          document.getElementById('resultMessage').innerText =
            data.action === 'CHECK_IN'
              ? '✅ Checked in successfully. Have a great workout!'
              : '👋 Checked out successfully. See you again!';

          setTimeout(() => window.location.reload(), 3000);
        } catch (err) {
          alert(err.message || 'Action failed');
        }
      }
    </script>
  </body>
</html>
