export type WorkspaceRole = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "CASHIER";

export function navForRole(role: WorkspaceRole) {
  switch (role) {
    case "ADMIN":
      return [
        ["Dashboard", "/dashboard"],
        ["Applications", "/applications"],
        ["Staff", "/staff"],
        ["Sections", "/sections"],
        ["Classes", "/classes"],
        ["Subjects", "/subjects"],
        ["Assign", "/assign"],
        ["Fees", "/fees"],
        ["Attendance", "/admin/attendance"],
        ["Announcements", "/announcements"],
        ["Talk to SkulGo Support", "/support"],
        ["Result Settings", "/settings"],
        ["Plan", "/plan"],
        ["My Account", "/account"],
      ];
    case "TEACHER":
      return [
        ["Dashboard", "/dashboard"],
        ["My Subjects", "/my-subjects"],
        ["Scores", "/scores"],
        ["Announcements", "/announcements"],
        ["My Account", "/account"],
      ];
    case "STUDENT":
      return [
        ["Dashboard", "/dashboard"],
        ["My Class", "/my-class"],
        ["My Subjects", "/my-subjects"],
        ["Attendance", "/attendance"],
        ["Results", "/results"],
        ["Fees", "/fees"],
        ["Announcements", "/announcements"],
        ["My Account", "/account"],
      ];
    case "PARENT":
      return [
        ["Dashboard", "/dashboard"],
        ["My Children", "/children"],
        ["Attendance", "/attendance"],
        ["Fees & Payments", "/fees"],
        ["Results", "/results"],
        ["Announcements", "/announcements"],
        ["My Account", "/account"],
      ];
    case "CASHIER":
      return [
        ["Dashboard", "/dashboard"],
        ["Fees", "/fees"],
        ["Payments", "/payments"],
        ["My Account", "/account"],
      ];
  }
}
