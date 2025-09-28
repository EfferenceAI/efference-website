interface TaskThumbnailProps {
  title: string;
  description: string;
  icon: string;
  onClick?: () => void;
}

export default function TaskThumbnail({ title, description, icon, onClick }: TaskThumbnailProps) {
  return (
    <div 
      onClick={onClick}
      className="bg-white border border-[#DCCFC0] rounded-lg p-6 hover:shadow-md hover:border-[#A2AF9B] transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-4">
        <div className="text-3xl">{icon}</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-[#111111] group-hover:text-[#A2AF9B] transition-colors">
            {title}
          </h3>
          <p className="text-[#666] text-sm mt-1">
            {description}
          </p>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-[#EEEEEE]">
        <div className="flex items-center justify-between text-xs text-[#666]">
          <span>Ready to categorize</span>
          <span className="bg-[#A2AF9B] text-white px-2 py-1 rounded-full text-xs">
            Active
          </span>
        </div>
      </div>
    </div>
  );
}