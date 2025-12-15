// --- RÉCUP USERID DE L'URL ---
const params = new URLSearchParams(window.location.search);
const userId = params.get("userId");

const mfaForm = document.getElementById("mfaForm");
const codeInput = document.getElementById("code");

// --- SOUMISSION MFA ---
mfaForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const code = codeInput.value;

  try {
    const res = await fetch("http://localhost:5000/api/auth/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, token: code })
    });

    const result = await res.json();

    if (result.error) {
      alert(result.error);
      return;
    }

    alert("MFA validé ! Login réussi.");
    localStorage.setItem("jwt", result.token);
    // rediriger vers dashboard ou page principale
    window.location.href = "dashboard.html";

  } catch (err) {
    console.error(err);
    alert("Erreur lors de la vérification MFA");
  }
});
