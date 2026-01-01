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
    const res = await fetch('api/public/checkin/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantCode, phone }),
    });

    const data = await res.json();
    if (!res.ok) throw data;

    memberId = data.memberId;

    document.getElementById('stepPhone').style.display = 'none';
    document.getElementById('stepConfirm').style.display = 'block';

    document.getElementById('memberName').innerText = `Hi ${data.name} 👋`;

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
    const res = await fetch('api/public/checkin/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantCode, memberId }),
    });

    const data = await res.json();
    if (!res.ok) throw data;

    document.getElementById('stepConfirm').style.display = 'none';
    document.getElementById('stepResult').style.display = 'block';

    document.getElementById('resultMessage').innerText =
      data.action === 'CHECK_IN'
        ? '✅ Checked in successfully. Have a great workout!'
        : '👋 Checked out successfully. See you again!';

    setTimeout(() => window.location.reload(), 3000);
  } catch (err) {
    alert(err.message || 'Action failed');
  }
}
