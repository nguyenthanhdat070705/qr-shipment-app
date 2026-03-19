async function check() {
  const json = {
    qrCode: "2AQ0138",
    maSanPhamXacNhan: "2AQ0138",
    hoTen: "Nguyen Thanh Dat",
    chucVu: "Thu kho",
    email: "datnt223@uef.edu.vn",
    note: "Test note"
  };
  
  try {
    const res = await fetch("http://localhost:3000/api/confirm-shipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(json)
    });
    
    const data = await res.json();
    console.log("RESPONSE:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("ERROR:", err);
  }
}
check();
