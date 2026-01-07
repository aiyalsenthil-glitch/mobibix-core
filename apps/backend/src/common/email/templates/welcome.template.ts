export function welcomeEmailTemplate(gymName: string) {
  return `
    <h2>Welcome to GymPilot 🎉</h2>
    <p>Your gym <b>${gymName}</b> has been successfully onboarded.</p>
    <p>You can now manage members, staff, attendance and payments.</p>
    <br />
    <p>— Team GymPilot</p>
  `;
}
