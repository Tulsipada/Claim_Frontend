import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function ClaimDetailsPage() {
  const { id } = useParams();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/claims/${id}`)
      .then((res) => res.json())
      .then((data) => {
        // Parse extracted_entities JSON safely
        let extra = {};
        try {
          extra = JSON.parse(data.extracted_entities || "{}");
        } catch (err) {
          extra = {};
        }
        setClaim({ ...data, extra });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-white">Loading...</div>;
  if (!claim) return <div className="text-white">Claim not found.</div>;

  return (
    <div className="p-8 bg-black min-h-screen text-white">

      <h1 className="text-3xl font-bold mb-6 text-yellow-400">
        CLAIM SUMMARY
      </h1>

      <div className="space-y-3 text-lg">

        <p>
          <strong className="text-yellow-300">Claim Type:</strong>{" "}
          {claim.claim_type || "N/A"}
        </p>

        <p>
          <strong className="text-yellow-300">Policyholder:</strong>{" "}
          {claim.name || "N/A"}
        </p>

        <p>
          <strong className="text-yellow-300">Policy Number:</strong>{" "}
          {claim.description || "N/A"}
        </p>

        <p>
          <strong className="text-yellow-300">Total Amount:</strong>{" "}
          {claim.extra.total_estimate ? `$${claim.extra.total_estimate}` : "N/A"}
        </p>

        <p>
          <strong className="text-yellow-300">OCR Used:</strong>{" "}
          {claim.extra.is_ocr ? "Yes" : "No"}
        </p>

        <p>
          <strong className="text-yellow-300">Dates:</strong>{" "}
          {claim.extra.dates && claim.extra.dates.length > 0
            ? claim.extra.dates.join(", ")
            : "N/A"}
        </p>

        <p>
          <strong className="text-yellow-300">File:</strong>{" "}
          {claim.filename}
        </p>

        <div className="mt-6">
          <strong className="text-yellow-300 block mb-2">Extracted Text:</strong>
          <div className="bg-gray-800 p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap">
            {claim.text || "No text available"}
          </div>
        </div>
      </div>
    </div>
  );
}
