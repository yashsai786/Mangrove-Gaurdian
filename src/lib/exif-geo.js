// Minimal EXIF extraction for geotagging (client-side, no dependencies)
// Usage: getImageLocation(file).then(({lat, lng}) => ...)
export function getImageLocation(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const view = new DataView(e.target.result);
      if (view.getUint16(0, false) !== 0xFFD8) return reject('Not a JPEG');
      let offset = 2;
      const length = view.byteLength;
      while (offset < length) {
        if (view.getUint16(offset + 2, false) <= 8) return reject('Invalid segment size');
        const marker = view.getUint16(offset, false);
        offset += 2;
        if (marker === 0xFFE1) {
          if (view.getUint32(offset += 2, false) !== 0x45786966) return reject('Not EXIF');
          const little = view.getUint16(offset += 6, false) === 0x4949;
          offset += view.getUint32(offset + 4, little);
          const tags = view.getUint16(offset, little);
          offset += 2;
          for (let i = 0; i < tags; i++) {
            if (view.getUint16(offset + (i * 12), little) === 0x8825) {
              const gpsOffset = view.getUint32(offset + (i * 12) + 8, little);
              let gps = offset + gpsOffset;
              const gpsTags = view.getUint16(gps, little);
              gps += 2;
              let lat, lng;
              for (let j = 0; j < gpsTags; j++) {
                const tag = view.getUint16(gps + (j * 12), little);
                if (tag === 0x0002) { // GPSLatitude
                  lat = getCoord(view, gps + (j * 12) + 8, little);
                } else if (tag === 0x0004) { // GPSLongitude
                  lng = getCoord(view, gps + (j * 12) + 8, little);
                }
              }
              if (lat && lng) return resolve({ lat, lng });
            }
          }
        } else if ((marker & 0xFF00) !== 0xFF00) break;
        else offset += view.getUint16(offset, false);
      }
      reject('No EXIF geotag found');
    };
    reader.readAsArrayBuffer(file);
  });
}

function getCoord(view, offset, little) {
  const d = n => view.getUint32(offset + n * 8, little) / view.getUint32(offset + n * 8 + 4, little);
  return d(0) + d(1) / 60 + d(2) / 3600;
}
