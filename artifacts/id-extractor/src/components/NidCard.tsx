import { useEffect, useRef } from "react";

export interface NidCardProps {
  nameBangla?: string;
  fullName?: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  idNumber?: string;
  pin?: string;
  address?: string;
  bloodGroup?: string;
  birthPlace?: string;
  issueDate?: string;
  photoFront?: string | null;
  photoBack?: string | null;
  gender?: string;
  maritalStatus?: string;
}

const WATERMARK =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/National_emblem_of_Bangladesh.svg/960px-National_emblem_of_Bangladesh.svg.png";
const GOV_LOGO =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Government_Seal_of_Bangladesh.svg/500px-Government_Seal_of_Bangladesh.svg.png";

export function NidCard(props: NidCardProps) {
  const barcodeRef = useRef<HTMLCanvasElement>(null);

  const {
    nameBangla = "", fullName = "", fatherName = "", motherName = "",
    dateOfBirth = "", idNumber = "", pin = "", address = "",
    bloodGroup = "", birthPlace = "", issueDate = "",
    photoFront, photoBack, gender, maritalStatus,
  } = props;

  const guardianLabel =
    gender === "female" && maritalStatus === "married" ? "স্বামী:" : "পিতা:";

  useEffect(() => {
    if (!barcodeRef.current) return;
    const xml = `<pin>${pin}</pin><name>${fullName}</name><DOB>${dateOfBirth}</DOB><FP></FP><F>Right Index</F><TYPE>A</TYPE><V>2.0</V><ds>302d021470a038a6371e01ee73774b31da7f56d93ddf5fd8021500842f431db46b407786fcdb${pin}1deb52a25dd2c4e77e</ds>`;
    import("bwip-js").then(({ default: bwipjs }) => {
      try {
        bwipjs.toCanvas(barcodeRef.current!, {
          bcid: "pdf417", text: xml, scale: 2, height: 10, includetext: false,
        });
      } catch {
      }
    });
  }, [pin, fullName, dateOfBirth]);

  return (
    <div className="nid-cards-row">

      {/* ── FRONT CARD ──────────────────────────────────── */}
      <div className="nid-card">
        <img src={WATERMARK} className="nid-watermark" alt="" />
        <img src={GOV_LOGO} className="nid-gov-logo" alt="" />

        <div className="nid-header-section">
          <p className="nid-gov-title">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</p>
          <p className="nid-gov-subtitle">Government of the People's Republic of Bangladesh</p>
        </div>

        <div className="nid-title-bar">
          <span className="nid-red-text">National ID Card</span>
          <span> / জাতীয় পরিচয় পত্র</span>
        </div>

        <div className="nid-card-body">
          <div className="nid-photo-side">
            {photoFront
              ? <img src={photoFront} className="nid-photo-box" alt="ছবি" />
              : <div className="nid-photo-box nid-photo-placeholder">ছবি</div>
            }
            {photoBack
              ? <img src={photoBack} className="nid-sig-box" alt="স্বাক্ষর" style={{ filter: "invert(1)" }} />
              : <div className="nid-sig-box nid-sig-placeholder" />
            }
          </div>

          <div className="nid-info-side">
            <div className="nid-data-row nid-name-row">
              <span className="nid-label">নাম:</span>
              <span className="nid-val-bn-bold nid-default-value">{nameBangla}</span>
            </div>
            <div className="nid-data-row">
              <span className="nid-label">Name:</span>
              <span className="nid-val-en-bold nid-default-value">{fullName.toUpperCase()}</span>
            </div>
            <div className="nid-data-row">
              <span className="nid-label">{guardianLabel}</span>
              <span className="nid-val-bn-reg nid-default-value">{fatherName}</span>
            </div>
            <div className="nid-data-row">
              <span className="nid-label">মাতা:</span>
              <span className="nid-val-bn-reg nid-default-value">{motherName}</span>
            </div>
            <div className="nid-data-row">
              <span className="nid-label">Date of Birth:</span>
              <span className="nid-val-red nid-dob-value">{dateOfBirth}</span>
            </div>
            <div className="nid-data-row">
              <span className="nid-label">ID NO:</span>
              <span className="nid-val-red nid-id-value">{idNumber}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── BACK CARD ───────────────────────────────────── */}
      <div className="nid-card">
        <div className="nid-back-top">
          এই কার্ডটি গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের সম্পত্তি। কার্ডটি ব্যবহারকারী ব্যতীত অন্য কোথাও পাওয়া গেলে নিকটস্থ পোস্ট অফিসে জমা দেওয়ার জন্য অনুরোধ করা হলো।
        </div>

        <div className="nid-back-container">
          <div className="nid-address-box">
            ঠিকানা: <span>{address}</span>
          </div>
        </div>

        <div className="nid-blood-row">
          <div className="nid-blood-left">
            রক্তের গ্রুপ / Blood Group:{" "}
            <span style={{ color: "red", fontWeight: "bold" }}>{bloodGroup}</span>
          </div>
          <div className="nid-pob-center">জন্মস্থান: <span>{birthPlace}</span></div>
          <div className="nid-print-right">
            <span className="nid-print-box">মুদ্রণ: ০১</span>
          </div>
        </div>

        <div className="nid-auth-section nid-back-container">
          <div className="nid-signature-part">
            <img
              src="/registrar-sig.png"
              style={{ width: "100px", height: "36px", marginBottom: "-6px", marginTop: "-6px", objectFit: "contain", display: "block" }}
              alt="স্বাক্ষর"
            />
            <div>প্রদানকারী কর্তৃপক্ষের স্বাক্ষর</div>
          </div>
          <div className="nid-issue-date-part">
            প্রদানের তারিখ: <span>{issueDate}</span>
          </div>
        </div>

        <div className="nid-barcode-wrap">
          <canvas ref={barcodeRef} style={{ width: "307px", height: "1cm" }} />
        </div>
      </div>
    </div>
  );
}
