/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from "react";
import {
	type UserSelectionsForClimateQueryStore,
	userSelectionsForClimateQueryStore,
} from "../stores/UserSelectionsForClimateQueryStore";

const UserSelectionsForClimateQueryContext =
	createContext<UserSelectionsForClimateQueryStore>(
		userSelectionsForClimateQueryStore,
	);

export function UserSelectionsForClimateQueryProvider({
	children,
}: { children: React.ReactNode }) {
	return (
		<UserSelectionsForClimateQueryContext.Provider
			value={userSelectionsForClimateQueryStore}
		>
			{children}
		</UserSelectionsForClimateQueryContext.Provider>
	);
}

export const useUserSelectionsForClimateQueryStore = () => {
	const context = useContext(UserSelectionsForClimateQueryContext);
	if (!context) {
		throw new Error(
			"useUserSelectionsForClimateQueryStore must be used within a UserSelectionsForClimateQueryProvider",
		);
	}
	return context;
};
