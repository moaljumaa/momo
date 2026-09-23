export function UserAvatar({
  name,
  image,
  className = "size-8 text-xs",
}: {
  name: string;
  image: string | null;
  className?: string;
}) {
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt="" className={`shrink-0 rounded-full object-cover ${className}`} />
  ) : (
    <div className={`flex shrink-0 items-center justify-center rounded-full bg-hover font-normal ${className}`}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
