import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

const SimpleMarkdown = ({ markdown }: { markdown: string }) => {
	return (
		<div className="simple-markdown">
			<ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
				{markdown}
			</ReactMarkdown>
		</div>
	);
};

export default SimpleMarkdown;
