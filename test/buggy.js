Berikut adalah kode yang telah diperbaiki:

```javascript
function tambah(a, b) {
    return a + b; // bug: harusnya a + b
  }
  
  function cetakNama(nama) {
    console.log("Halo " + nama); // bug: variabel 'nama' berbeda dengan fungsi 'cetakNama'
  }
  
  tambah(5, 3);
  cetakNama("Sigma");
```