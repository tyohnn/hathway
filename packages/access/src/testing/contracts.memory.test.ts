import { accountDirectoryMemory } from "./accountDirectoryMemory.ts";
import { accountDirectoryContract } from "./contracts/account-directory.ts";
import { teamDirectoryContract } from "./contracts/team-directory.ts";
import { teamWorldMemory } from "./teamDirectoryMemory.ts";

// 계정에 세션을 잇는 쓰기가 한 번만 성공한다는 것(INV-ACCESS-08)을 두 구현에서 잰다
accountDirectoryContract("memory", accountDirectoryMemory);

// 팀 명부. 두 테넌트가 한 명부에 서야 다른 테넌트를 가리는지를 재므로 명부 하나를 여러 번 부른다
teamDirectoryContract("memory", teamWorldMemory().make);
