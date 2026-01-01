const tenantCode = window.location.pathname.split('/').pop();
let memberId = null;
//Temp add
async function lookup() {
  const phone = document.getElementById('phone').value;
  const errorDiv = document.getElementById('phoneError');
  errorDiv.innerText = '';

  if (!phone) {
    errorDiv.innerText = 'Please enter phone number';
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

    document.getElementById('stepPhone').style.display = 'none';
    document.getElementById('stepConfirm').style.display = 'block';
    document.getElementById('memberName').innerText = `Hi ${data.name} 👋`;

    if (data.paymentStatus === 'PARTIAL') {
      document.getElementById('paymentInfo').innerText =
        `⚠ Pending amount: ₹${data.pendingAmount}`;
    } else {
      document.getElementById('paymentInfo').innerText = '';
    }

    document.getElementById('confirmBtn').innerText = data.isInside
      ? 'Check Out'
      : 'Check In';
  } catch (err) {
    errorDiv.innerText = err.message || 'Something went wrong';
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

    document.getElementById('stepConfirm').style.display = 'none';
    document.getElementById('stepResult').style.display = 'block';
    document.getElementById('resultMessage').innerText =
      data.action === 'CHECK_IN'
        ? '✅ Checked in successfully!'
        : '👋 Checked out successfully!';

    setTimeout(() => window.location.reload(), 3000);
  } catch (err) {
    alert(err.message || 'Action failed');
  }
}
