import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { Target } from '../../types/cli';
export abstract class BaseNode implements TreeItem {

	public abstract readonly collapsibleState: TreeItemCollapsibleState;
	public abstract readonly contextValue: string;
	public readonly deviceId: string | undefined;
	public readonly label: string;
	public readonly targetId?: Target;
	public readonly version?: string | undefined;
	constructor (label: string) {
		this.label = label;
	}

	public getTreeItem (element: BaseNode): BaseNode {
		return element;
	}

	public getChildren (_element: BaseNode): BaseNode[] | Promise<BaseNode[]>  {
		return [];
	}
}
