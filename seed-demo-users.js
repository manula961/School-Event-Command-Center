import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  "https://qpxqpipnqniffaexohzt.supabase.co";

const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_SECRET_KEY) {
  console.error(
    "Missing SUPABASE_SECRET_KEY environment variable."
  );

  process.exit(1);
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const demoPassword = "EventHub@2026";

const cmsUsers = [
  {
    fullName: "Demo Principal",
    email: "principal@eventhub.demo",
    role: "principal",
    title: "Principal",
    requiresSociety: false,
  },
  {
    fullName: "Demo Vice Principal",
    email: "vp@eventhub.demo",
    role: "vice_principal",
    title: "Vice Principal",
    requiresSociety: false,
  },
  {
    fullName: "Demo Teacher",
    email: "teacher@eventhub.demo",
    role: "teacher",
    title: "Teacher-in-Charge",
    requiresSociety: true,
  },
  {
    fullName: "Demo Student Admin",
    email: "studentadmin@eventhub.demo",
    role: "student_admin",
    title: "Student Administrator",
    requiresSociety: true,
  },
  {
    fullName: "Demo Event Staff",
    email: "eventstaff@eventhub.demo",
    role: "event_staff",
    title: "Event Staff",
    requiresSociety: false,
  },
];

const studentUser = {
  fullName: "Demo Student",
  email: "student@eventhub.demo",
  studentId: "STU-DEMO-001",
  grade: "12",
  className: "12-A",
};

async function findAuthUserByEmail(email) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const {
      data,
      error,
    } =
      await supabase.auth.admin.listUsers({
        page,
        perPage,
      });

    if (error) {
      throw error;
    }

    const found =
      data.users.find(
        (user) =>
          user.email?.toLowerCase() ===
          email.toLowerCase()
      );

    if (found) {
      return found;
    }

    if (
      data.users.length <
      perPage
    ) {
      return null;
    }

    page += 1;
  }
}

async function getOrCreateSociety() {
  console.log(
    "\nChecking demo society..."
  );

  const {
    data: existing,
    error: findError,
  } =
    await supabase
      .from("societies")
      .select("*")
      .eq("code", "DEMO")
      .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (existing) {
    console.log(
      `✓ Demo society already exists: ${existing.name}`
    );

    return existing;
  }

  const {
    data,
    error,
  } =
    await supabase
      .from("societies")
      .insert({
        name: "Demo Society",
        code: "DEMO",
        description:
          "Society used for EventHub demonstration accounts.",
      })
      .select()
      .single();

  if (error) {
    throw error;
  }

  console.log(
    `✓ Created society: ${data.name}`
  );

  return data;
}

async function createOrUpdateCmsUser(
  user,
  societyId
) {
  console.log(
    `\nProcessing ${user.fullName}...`
  );

  let authUser =
    await findAuthUserByEmail(
      user.email
    );

  if (!authUser) {
    const {
      data,
      error,
    } =
      await supabase.auth.admin.createUser({
        email: user.email,
        password: demoPassword,
        email_confirm: true,

        user_metadata: {
          full_name:
            user.fullName,
        },
      });

    if (error) {
      throw error;
    }

    authUser =
      data.user;

    console.log(
      "✓ Authentication account created"
    );
  } else {
    const {
      error,
    } =
      await supabase.auth.admin.updateUserById(
        authUser.id,
        {
          password:
            demoPassword,

          email_confirm:
            true,

          user_metadata: {
            full_name:
              user.fullName,
          },
        }
      );

    if (error) {
      throw error;
    }

    console.log(
      "✓ Existing authentication account updated"
    );
  }

  const {
    error:
      profileError,
  } =
    await supabase
      .from("profiles")
      .upsert(
        {
          id:
            authUser.id,

          full_name:
            user.fullName,

          email:
            user.email,

          role:
            user.role,

          title:
            user.title,

          society_id:
            user.requiresSociety
              ? societyId
              : null,

          permission_overrides:
            {},

          is_active:
            true,

          updated_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            "id",
        }
      );

  if (profileError) {
    throw profileError;
  }

  console.log(
    `✓ CMS profile ready as ${user.role}`
  );

  return authUser;
}

async function createOrUpdateStudent() {
  console.log(
    `\nProcessing ${studentUser.fullName}...`
  );

  let authUser =
    await findAuthUserByEmail(
      studentUser.email
    );

  if (!authUser) {
    const {
      data,
      error,
    } =
      await supabase.auth.admin.createUser({
        email:
          studentUser.email,

        password:
          demoPassword,

        email_confirm:
          true,

        user_metadata: {
          account_type:
            "student",

          full_name:
            studentUser.fullName,

          student_id:
            studentUser.studentId,
        },
      });

    if (error) {
      throw error;
    }

    authUser =
      data.user;

    console.log(
      "✓ Student authentication account created"
    );
  } else {
    const {
      error,
    } =
      await supabase.auth.admin.updateUserById(
        authUser.id,
        {
          password:
            demoPassword,

          email_confirm:
            true,

          user_metadata: {
            account_type:
              "student",

            full_name:
              studentUser.fullName,

            student_id:
              studentUser.studentId,
          },
        }
      );

    if (error) {
      throw error;
    }

    console.log(
      "✓ Existing student authentication account updated"
    );
  }

  const {
    error:
      profileError,
  } =
    await supabase
      .from("student_profiles")
      .upsert(
        {
          id:
            authUser.id,

          full_name:
            studentUser.fullName,

          student_id:
            studentUser.studentId,

          grade:
            studentUser.grade,

          class_name:
            studentUser.className,
        },
        {
          onConflict:
            "id",
        }
      );

  if (profileError) {
    throw profileError;
  }

  console.log(
    "✓ Student profile ready"
  );

  return authUser;
}

async function main() {
  console.log(
    "===================================="
  );

  console.log(
    " EventHub Demo Account Seeder"
  );

  console.log(
    "===================================="
  );

  try {
    const society =
      await getOrCreateSociety();

    const createdCmsUsers =
      {};

    for (
      const user of cmsUsers
    ) {
      createdCmsUsers[
        user.role
      ] =
        await createOrUpdateCmsUser(
          user,
          society.id
        );
    }

    await createOrUpdateStudent();

    console.log(
      "\n===================================="
    );

    console.log(
      "All demo accounts are ready."
    );

    console.log(
      "====================================\n"
    );

    console.table([
      {
        Role:
          "Principal",
        Email:
          "principal@eventhub.demo",
        Password:
          demoPassword,
      },
      {
        Role:
          "Vice Principal",
        Email:
          "vp@eventhub.demo",
        Password:
          demoPassword,
      },
      {
        Role:
          "Teacher-in-Charge",
        Email:
          "teacher@eventhub.demo",
        Password:
          demoPassword,
      },
      {
        Role:
          "Student Admin",
        Email:
          "studentadmin@eventhub.demo",
        Password:
          demoPassword,
      },
      {
        Role:
          "Event Staff",
        Email:
          "eventstaff@eventhub.demo",
        Password:
          demoPassword,
      },
      {
        Role:
          "Student",
        Email:
          "student@eventhub.demo",
        Password:
          demoPassword,
      },
    ]);

    console.log(
      "\nTeacher and Student Admin society:"
    );

    console.log(
      `${society.name} (${society.code})`
    );

    console.log(
      "\nYou can now test each role."
    );
  } catch (error) {
    console.error(
      "\nSeeder failed:"
    );

    console.error(
      error.message ||
        error
    );

    process.exit(1);
  }
}

main();