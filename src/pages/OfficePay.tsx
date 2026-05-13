import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  CreditCard
} from 'lucide-react';

export function OfficePayPage() {
  const { driver } = useAuth();
  const fee = driver?.officeFee || 0;

  const upiId = "123mdcreation@okaxis";
  const name = "DHIWAKAR M";
  const supportPhone = "919488834020";

  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${fee}&cu=INR&tn=Office%20Fee`;

  const whatsappUrl = `https://wa.me/${supportPhone}?text=${encodeURIComponent(
    `Hi Admin, I have paid ₹${fee}. Driver ID: ${driver?.id?.toUpperCase() || 'UNKNOWN'}`
  )}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-red-600 to-red-500 text-white px-6 py-5">
          <h1 className="text-xl font-bold">Office Payment</h1>
          <p className="text-xs opacity-80">Secure UPI Checkout</p>
        </div>

        {/* MERCHANT */}
        <div className="px-6 py-4 border-b">
          <p className="text-[11px] tracking-widest text-gray-400 uppercase">
            Merchant
          </p>
          <p className="font-semibold text-gray-900">{name}</p>
          <p className="text-xs text-gray-500">Office Fee Collection</p>
        </div>

        {/* AMOUNT */}
        <div className="px-6 py-6">
          <div className="bg-gray-50 border rounded-2xl p-6 text-center shadow-sm">

            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Amount Due
            </p>

            <p className="text-4xl font-extrabold text-gray-900 mt-2">
              ₹{fee}.00
            </p>

            <div className="mt-3">
              {fee > 0 ? (
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full">
                  <AlertCircle size={14} /> Pending Payment
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <CheckCircle2 size={14} /> Cleared
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        {fee > 0 && (
          <div className="px-6 space-y-4 pb-6">

            {/* UPI CARD */}
            <div className="border rounded-2xl p-4 bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="text-red-500" size={18} />
                <p className="font-semibold text-sm">Pay via UPI</p>
              </div>

              <p className="text-xs text-gray-500 mb-3">
                Instant transfer using any UPI app
              </p>

              <div className="bg-gray-100 rounded-xl px-3 py-2 text-xs font-mono text-gray-700">
                {upiId}
              </div>
            </div>

            {/* PAY BUTTON */}
            <a
              href={upiUrl}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-500 text-white py-4 rounded-2xl font-semibold shadow-lg active:scale-95 transition"
            >
              <CreditCard size={18} />
              Pay ₹{fee}
            </a>

            {/* WHATSAPP */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-2xl font-semibold shadow-md active:scale-95"
            >
              <MessageCircle size={18} />
              Send Proof on WhatsApp
            </a>

            {/* NOTE */}
            <p className="text-[11px] text-gray-500 text-center leading-relaxed px-2">
              Payments are verified manually within 1–2 hours. Keep screenshot as proof.
            </p>
          </div>
        )}

        {/* SUCCESS */}
        {fee === 0 && (
          <div className="px-6 py-16 text-center">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="text-green-600" size={34} />
            </div>

            <p className="mt-4 text-lg font-semibold text-gray-800">
              All dues cleared
            </p>

            <p className="text-xs text-gray-500 mt-1">
              Your account is fully up to date
            </p>
          </div>
        )}

      </div>
    </div>
  );
}