const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('https://heritageai-backend.onrender.com/monument/recognize', {
      image_b64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
      filename: "test.jpg"
    }, { timeout: 60000 });
    console.log("Success:", res.data);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
test();
