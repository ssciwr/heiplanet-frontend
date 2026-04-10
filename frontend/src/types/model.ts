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
	// todo: integrate units so it appears in the Legend etc.
	output?: string[];
	model_output_variable?: string;
	cardYamlUrl?: string;
}
