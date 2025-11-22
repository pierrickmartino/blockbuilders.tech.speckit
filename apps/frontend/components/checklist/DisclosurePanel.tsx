'use client';

interface DisclosurePanelProps {
  text: string;
}

export const DisclosurePanel = ({ text }: DisclosurePanelProps) => {
  return (
    <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/80 p-3 text-sm text-blue-900" role="note">
      {text}
    </div>
  );
};
