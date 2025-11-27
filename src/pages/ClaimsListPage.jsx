import { useEffect, useState } from "react";

export default function ClaimsPage() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/claims")
      .then((res) => res.json())
      .then((data) => {
        const formatted = data
          .map((claim) => {
            let extra = {};
            try {
              extra = JSON.parse(claim.extracted_entities || "{}");
            } catch {
              extra = {};
            }
            return { ...claim, extra };
          })
          .reverse();

        setClaims(formatted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-10 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 px-6 py-10 w-full flex flex-col items-center">

      {/* Centered Title */}
      <h1 className="text-4xl font-bold text-center text-gray-900 mb-10 w-full">
        All Claims
      </h1>

      {/* Wrapper */}
      <div className="max-w-7xl mx-auto w-full">

        <div className="overflow-x-auto bg-white rounded-xl shadow-xl border border-gray-300">

          <table className="min-w-full text-left text-gray-900">

            {/* TABLE HEADER */}
            <thead className="bg-yellow-600 text-black font-bold">
              <tr>
                <th className="px-6 py-3 text-center">SL</th>
                <th className="px-6 py-3">Claim Type</th>
                <th className="px-6 py-3">Policyholder</th>
                <th className="px-6 py-3">Policy Number</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">File</th>
                <th className="px-6 py-3">Dates</th>
              </tr>
            </thead>

            {/* TABLE BODY */}
            <tbody>
  {claims.map((claim, index) => (
    <tr
      key={index}
      className={
        index % 2 === 0
          ? "bg-gray-800 border-b border-gray-700"
          : "bg-gray-900 border-b border-gray-700"
      }
    >

      {/* SL NUMBER */}
      <td className="px-6 py-4 text-center font-bold text-yellow-400">
        {index + 1}
      </td>

      {/* Claim Type - FIXED */}
      <td className="px-6 py-4 text-white">
        {claim.claim_type ||
          claim.extra.claim_type ||
          claim.extra.type ||
          claim.extra.category ||
          "N/A"}
      </td>

      {/* Policyholder */}
      <td className="px-6 py-4 text-white">{claim.name || "N/A"}</td>

      {/* Policy Number */}
      <td className="px-6 py-4 text-white">{claim.description || "N/A"}</td>

      {/* Amount */}
      <td className="px-6 py-4 text-white">
        {claim.extra.total_estimate || "N/A"}
      </td>

      {/* File */}
      <td className="px-6 py-4 text-white">{claim.filename}</td>

      {/* Dates */}
      <td className="px-6 py-4 text-white">
        {claim.extra.dates?.length
          ? claim.extra.dates.join(", ")
          : "N/A"}
      </td>

    </tr>
  ))}
</tbody>

          </table>

        </div>

      </div>
    </div>
  );
}
