export type WorkspaceRole = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "CASHIER";

export type WorkspaceNavItem = [label: string, href: string];
export type WorkspaceNavGroup = {
  label: string;
  items: WorkspaceNavItem[];
};

export function navForRole(role: WorkspaceRole): WorkspaceNavGroup[] {
  switch (role) {
    case "ADMIN":
      return [
        {
          label: "School",
          items: [
            ["Applications", "/applications"],
            ["Staff", "/staff"],
            ["Sections", "/sections"],
            ["Classes", "/classes"],
            ["Subjects", "/subjects"],
            ["Assign", "/assign"],
          ],
        },
        {
          label: "Academics",
          items: [
            ["Attendance", "/admin/attendance"],
            ["Results", "/results"],
          ],
        },
        {
          label: "Finance",
          items: [
            ["Fees", "/fees"],
          ],
        },
        {
          label: "Communication",
          items: [
            ["Announcements", "/announcements"],
            ["Support", "/support"],
          ],
        },
        {
          label: "Account",
          items: [
            ["Plan", "/plan"],
            ["Admin Handover", "/admin/handover"],
            ["My Account", "/account"],
          ],
        },
      ];
    case "TEACHER":
      return [
        {
          label: "Workspace",
          items: [
            ["My Subjects", "/my-subjects"],
            ["Scores", "/scores"],
            ["Announcements", "/announcements"],
            ["My Account", "/account"],
          ],
        },
      ];
    case "STUDENT":
      return [
        {
          label: "Workspace",
          items: [
            ["My Class", "/my-class"],
            ["My Subjects", "/my-subjects"],
            ["Attendance", "/attendance"],
            ["Results", "/results"],
            ["Fees", "/fees"],
            ["Announcements", "/announcements"],
            ["My Account", "/account"],
          ],
        },
      ];
    case "PARENT":
      return [
        {
          label: "Workspace",
          items: [
            ["My Children", "/children"],
            ["Attendance", "/attendance"],
            ["Fees & Payments", "/fees"],
            ["Results", "/results"],
            ["Announcements", "/announcements"],
            ["My Account", "/account"],
          ],
        },
      ];
    case "CASHIER":
      return [
        {
          label: "Workspace",
          items: [
            ["Fees", "/fees"],
            ["Payments", "/payments"],
            ["My Account", "/account"],
          ],
        },
      ];
  }
}
