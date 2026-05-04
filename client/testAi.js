const base = "http://localhost:5173";
(async () => {
  try {
    const regRes = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Live Tester", email: `test${Date.now()}@example.com`, password: "Test1234!" })
    });

    const regData = await regRes.json();
    console.log("token length", regData.token?.length);

    const aiRes = await fetch(`${base}/api/ai-create-ticket`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${regData.token}` },
      body: JSON.stringify({ prompt: "The cafeteria coffee machine is broken and students cannot get hot drinks." })
    });

    console.log("status", aiRes.status);
    const aiData = await aiRes.json();
    console.log(aiData);
  } catch (err) {
    console.error(err);
  }
})();
