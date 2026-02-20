export interface Model {
	id: string;
	modelName: string;
	title?: string;
	description?: string;
	emoji?: string;
	icon?: string;
	color?: string;
	details?: string;
	image?: string;
	authors?: string[];
	paper?: {
		paperTitle: string;
		url: string;
	};
	output?: string[];
	cardMarkdown?: string;
	cardYamlUrl?: string;
	virusType?: string;
}
