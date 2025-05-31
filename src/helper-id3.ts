import { Buffer } from 'buffer';

// https://stackoverflow.com/questions/20212560/read-id3-v2-4-tags-with-native-chrome-javascript-filereader-dataview

class Id3DataView extends DataView<ArrayBuffer> {
  private getString(start: number, length = 1) {
    let result = '';
    for (let c = 0; c < length; ) {
      const ints = this.getUint8(start + c++);
      // Filter unwanted characters
      if (ints > 31 && !(ints > 126 && ints < 161) && ints < 253) {
        result += String.fromCharCode(ints);
      }
    }
    return result;
  }

  private getInt(start: number) {
    return (
      (this.getUint8(start) << 21) |
      (this.getUint8(start + 1) << 14) |
      (this.getUint8(start + 2) << 7) |
      this.getUint8(start + 3)
    );
  }

  private decodeSynchsafeInt(offset: number): number {
    return (
      (this.getUint8(offset) << 21) |
      (this.getUint8(offset + 1) << 14) |
      (this.getUint8(offset + 2) << 7) |
      this.getUint8(offset + 3)
    );
  }

  private getAPIC(id: number, x: number, size: number) {
    try {
      const encodingByte = this.getUint8(id + x);
      const encodingMap: Record<number, string> = {
        0: "iso-8859-1",
        1: "utf-16",
        2: "utf-16be",
        3: "utf-8",
      };
      const encoding = encodingMap[encodingByte] || "utf-8";
      const textDecoder = new TextDecoder(encoding);
      const asciiDecoder = new TextDecoder("ascii");

      let offset = id + x + 1;

      // 1. Read MIME type (ASCII, null-terminated)
      let mimeEnd = offset;
      while (this.getUint8(mimeEnd) !== 0) mimeEnd++;
      const mimeBytes = new Uint8Array(this.buffer.slice(offset, mimeEnd));
      const mimeType = asciiDecoder.decode(mimeBytes);
      offset = mimeEnd + 1;

      // 2. Read picture type (1 byte)
      const pictureType = this.getUint8(offset);
      offset += 1;

      // 3. Read description (null-terminated in selected encoding)
      let descEnd = offset;

      if (encodingByte === 1 || encodingByte === 2) {
        // UTF-16: null terminator is 2 bytes
        while (
          descEnd + 1 < id + size &&
          !(this.getUint8(descEnd) === 0 && this.getUint8(descEnd + 1) === 0)
        ) {
          descEnd += 2;
        }
      } else {
        // Single-byte encoding: null is one byte
        while (descEnd < id + size && this.getUint8(descEnd) !== 0) {
          descEnd += 1;
        }
      }

      const descBytes = new Uint8Array(this.buffer.slice(offset, descEnd));
      const description = textDecoder.decode(descBytes);
      offset = descEnd + (encodingByte === 1 || encodingByte === 2 ? 2 : 1);

      // 4. Remaining data is image
      // const imageData = new Uint8Array(a.buffer.slice(offset, id + size));
      const imageData = new Uint8Array(this.buffer.slice(offset, id + x + size));

      return {
        format: mimeType,
        description,
        type: pictureType,
        data: imageData,
      };
    } catch (error) {
      console.error("getAPIC error:", error);
      return {};
    }
  }
}

export const readID3 = (buffer: ArrayBuffer) => {
  let dataView = new Id3DataView(buffer);
  let frameSize: number;
  let frameChar: string;
  let frameName: string;
  if (!dataView || dataView.getString(0, 3) != 'ID3') {
    return {};
  }
  const versionMinor = dataView.getUint8(3);
  const versionPatch = dataView.getUint8(4);
  const tags: any = {
    Version: `ID3v2.${versionMinor}.${versionPatch}`,
  };
  const isV24 = versionMinor === 4;

  const tagSize = dataView.getInt(6) + 10;
  const hasExtendedHdr = (dataView.getUint8(5) & 64) != 0
  const headerSize = hasExtendedHdr ? dataView.getInt(10) : 0;

  dataView = new Id3DataView(dataView.buffer.slice(10 + headerSize, tagSize));

  const position = dataView.byteLength;
  const nameSize = 10;
  let id3FrameSize = 0;
  let hasApic = false;
  for (; true; ) {
    frameChar = dataView.getString(id3FrameSize);
    frameSize = isV24
      ? dataView.decodeSynchsafeInt(id3FrameSize + 4)
      : dataView.getUint32(id3FrameSize + 4, false);

    if (
      position - id3FrameSize < nameSize ||
      frameChar < 'A' ||
      frameChar > 'Z' ||
      id3FrameSize + frameSize > position
    ) {
      break;
    }
    frameName = dataView.getString(id3FrameSize, 4);

    if (frameName !== 'APIC' || (frameName === 'APIC' && !hasApic)) {
      hasApic = frameName === 'APIC';
      tags[frameName] = hasApic
        ? dataView.getAPIC(id3FrameSize, nameSize, frameSize)
        : dataView.getString(id3FrameSize + nameSize, frameSize);
    }
    console.log(frameName, tags[frameName]);
    id3FrameSize += frameSize + nameSize;
  }
  console.log(tags);
  return tags;
};

export function imageURL (bytes, format) {
  // const blob = new Blob([bytes], { type: format });
  // const url = URL.createObjectURL(blob);
  // return url;

  let encoded = ''
  bytes.forEach(function (byte) {
    encoded += String.fromCharCode(byte)
  })

  return `data:${format};base64,${btoa(encoded)}`
}

export const extractId3Info = (id3: any = {}) => {
  const {
    APIC = {},
    TALB = '',
    TBPM,
    TIT1 = '',
    TIT2 = '',
    TPE1 = '',
    TPE2 = '',
    TYER,
    TDRC,
    TKEY,
  } = id3;
  return {
    title: TIT2 || TIT1,
    artist: TPE1 || TPE2,
    album: TALB,
    cover: APIC.data ? APIC : '',
    year: TYER || TDRC,
    bpm: TBPM,
    key: TKEY,
  };
};

// public static textFrames: {[key in FrameAlias]: FrameName} = {
// 		album: "TALB",
// 		bpm: "TBPM",
// 		composer: "TCOM",
// 		genre: "TCON",
// 		copyright: "TCOP",
// 		date: "TDAT",
// 		playlistDelay: "TDLY",
// 		encodedBy: "TENC",
// 		textWriter: "TEXT",
// 		fileType: "TFLT",
// 		time: "TIME",
// 		contentGroup: "TIT1",
// 		title: "TIT2",
// 		subtitle: "TIT3",
// 		initialKey: "TKEY",
// 		language: "TLAN",
// 		length: "TLEN",
// 		mediaType: "TMED",
// 		originalTitle: "TOAL",
// 		originalFilename: "TOFN",
// 		originalTextwriter: "TOLY",
// 		originalArtist: "TOPE",
// 		originalYear: "TORY",
// 		fileOwner: "TOWN",
// 		artist: "TPE1",
// 		performerInfo: "TPE2",
// 		conductor: "TPE3",
// 		remixArtist: "TPE4",
// 		partOfSet: "TPOS",
// 		publisher: "TPUB",
// 		trackNumber: "TRCK",
// 		recordingDates: "TRDA",
// 		internetRadioName: "TRSN",
// 		internetRadioOwner: "TRSO",
// 		size: "TSIZ",
// 		ISRC: "TSRC",
// 		encodingTechnology: "TSSE",
// 		year: "TYER"
// 	};

// 	public static textFramesV220: {[key in V2FrameAlias]: V2FrameName} = {
// 		album: "TAL",
// 		bpm: "TBP",
// 		composer: "TCM",
// 		genre: "TCO",
// 		copyright: "TCR",
// 		date: "TDA",
// 		playlistDelay: "TDY",
// 		encodedBy: "TEN",
// 		textWriter: "TXT",
// 		fileType: "TFT",
// 		time: "TIM",
// 		contentGroup: "TT1",
// 		title: "TT2",
// 		subtitle: "TT3",
// 		initialKey: "TKE",
// 		language: "TLA",
// 		length: "TLE",
// 		mediaType: "TMT",
// 		originalTitle: "TOT",
// 		originalFilename: "TOF",
// 		originalTextwriter: "TOL",
// 		originalArtist: "TOA",
// 		originalYear: "TOR",
// 		artist: "TP1",
// 		performerInfo: "TP2",
// 		conductor: "TP3",
// 		remixArtist: "TP4",
// 		partOfSet: "TPA",
// 		publisher: "TPB",
// 		trackNumber: "TRK",
// 		recordingDates: "TRD",
// 		size: "TSI",
// 		ISRC: "TRC",
// 		encodingTechnology: "TSS",
// 		year: "TYE"
// 	};

// 	public static specialFrames: {[key in SpecialFrameAlias]: SpecialFrameName} = {
// 		comment: "COMM",
// 		image: "APIC",
// 		unsynchronisedLyrics: "USLT",
// 		userDefinedText: "TXXX"
// 	};