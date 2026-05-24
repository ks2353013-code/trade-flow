async function enrichSupplierWebsite() {

  const url =
    prompt("Enter supplier website URL");

  if (!url) return;

  try {

    const response =
      await fetch(
        `${BACKEND_URL}/api/live-supplier-intelligence/scrape`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ url })
        }
      );

    const data = await response.json();

    if (!data.success) {
      alert("Scraping failed");
      return;
    }

    alert(
      `Company: ${data.title}

Emails:
${data.emails.join("\n")}

Phones:
${data.phones.join("\n")}

Verification Score:
${data.verificationScore}`
    );

  } catch (error) {

    console.error(error);

    alert("Supplier intelligence failed");

  }

}