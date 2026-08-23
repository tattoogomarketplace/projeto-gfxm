'use client';

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { motion } from 'framer-motion';

interface OtpInputProps {
  length: number;
  onComplete: (otp: string) => void;
  isLoading: boolean;
}

export function OtpInput({ length = 6, onComplete, isLoading }: OtpInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((val) => val !== '')) {
      onComplete(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const data = e.clipboardData.getData('text').slice(0, length);
    const newOtp = data.split('');
    setOtp(newOtp);
    if (newOtp.length === length) onComplete(data);
  };

  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {otp.map((digit, index) => (
        <motion.input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          disabled={isLoading}
          className="w-12 h-14 text-center text-2xl font-bold bg-zinc-900 border border-zinc-700 rounded-lg text-orange-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
        />
      ))}
    </div>
  );
}
