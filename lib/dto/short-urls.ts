import { UrlMeta, UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";

import { getStartDate } from "../utils";

export interface ShortUrlFormData {
  id?: string;
  userId: string;
  userName: string;
  target: string;
  url: string;
  prefix: string;
  title: string;
  description: string;
  image: string;
  visible: number;
  active: number;
  expiration: string;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserShortUrlInfo extends ShortUrlFormData {
  // meta: Omit<UrlMeta, "id">;
  meta?: UrlMeta;
}

export async function getUserShortUrls(
  userId: string,
  active: number = 1,
  page: number,
  size: number,
  role: UserRole = "USER",
  userName: string = "",
  url: string = "",
  target: string = "",
  title: string = "",
  description: string = "",
  image: string = "",
) {
  let option: any =
    role === "USER"
      ? {
          userId,
          // active,
        }
      : {};

  if (userName) {
    option.userName = {
      contains: userName,
    };
  }
  if (url) {
    option.url = {
      contains: url,
    };
  }
  if (target) {
    option.target = {
      contains: target,
    };
  }
  if (title) {
    option.title = {
      contains: title,
    };
  }
  if (description) {
    option.description = {
      contains: description,
    };
  }
  if (image) {
    option.image = {
      contains: image,
    };
  }

  const [total, list] = await prisma.$transaction([
    prisma.userUrl.count({
      where: option,
    }),
    prisma.userUrl.findMany({
      where: option,
      skip: (page - 1) * size,
      take: size,
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);
  return {
    total,
    list,
  };
}

export async function getUserShortUrlCount(
  userId: string,
  active: number = 1,
  role: UserRole = "USER",
) {
  try {
    // Start of last month from now
    // const end = new Date();
    // const start = new Date(
    //   end.getFullYear(),
    //   end.getMonth() - 1,
    //   end.getDate(),
    //   end.getHours(),
    //   end.getMinutes(),
    //   end.getSeconds(),
    // );

    // Start of current month
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const [total, month_total] = await prisma.$transaction([
      prisma.userUrl.count({
        where: role === "USER" ? { userId } : {},
      }),
      prisma.userUrl.count({
        where:
          role === "USER"
            ? { userId, createdAt: { gte: start, lte: end } }
            : { createdAt: { gte: start, lte: end } },
      }),
    ]);
    return { total, month_total };
  } catch (error) {
    return { total: -1, month_total: -1 };
  }
}

export async function createUserShortUrl(data: ShortUrlFormData) {
  try {
    const res = await prisma.userUrl.create({
      data: {
        userId: data.userId,
        userName: data.userName || "Anonymous",
        target: data.target,
        url: data.url,
        prefix: data.prefix,
        title: data.title,
        description: data.description,
        image: data.image,
        visible: data.visible,
        active: data.active,
        expiration: data.expiration,
        password: data.password,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    return { status: "success", data: res };
  } catch (error) {
    return { status: error };
  }
}

export async function updateUserShortUrl(data: ShortUrlFormData) {
  try {
    const res = await prisma.userUrl.update({
      where: {
        id: data.id,
        userId: data.userId,
      },
      data: {
        target: data.target,
        url: data.url,
        visible: data.visible,
        prefix: data.prefix,
        title: data.title,
        description: data.description,
        image: data.image,
        // active: data.active,
        expiration: data.expiration,
        password: data.password,
        updatedAt: new Date().toISOString(),
      },
    });
    return { status: "success", data: res };
  } catch (error) {
    return { status: error };
  }
}

export async function updateUserShortUrlActive(
  userId: string,
  id: string,
  active: number = 1,
  role: UserRole = "USER",
) {
  try {
    const option = role === "USER" ? { userId, id } : { id };
    const res = await prisma.userUrl.update({
      where: option,
      data: {
        active,
        updatedAt: new Date().toISOString(),
      },
    });
    return { status: "success", data: res };
  } catch (error) {
    return { status: error };
  }
}

export async function updateUserShortUrlVisibility(
  id: string,
  visible: number,
) {
  try {
    const res = await prisma.userUrl.update({
      where: {
        id,
      },
      data: {
        visible,
        updatedAt: new Date().toISOString(),
      },
    });
    return { status: "success", data: res };
  } catch (error) {
    return { status: error };
  }
}

export async function deleteUserShortUrl(userId: string, urlId: string) {
  return await prisma.userUrl.delete({
    where: {
      id: urlId,
      userId,
    },
  });
}

export async function getUserUrlMetaInfo(
  urlId: string,
  dateRange: string = "",
) {
  const startDate = getStartDate(dateRange);
  return await prisma.urlMeta.findMany({
    where: {
      urlId,
      ...(startDate && {
        createdAt: { gte: startDate },
      }),
    },
    orderBy: { updatedAt: "asc" },
  });
}

export async function getUrlBySuffix(suffix: string) {
  return await prisma.userUrl.findFirst({
    where: {
      url: suffix,
    },
    select: {
      id: true,
      target: true,
      title: true,
      description: true,
      image: true,
      active: true,
      prefix: true,
      expiration: true,
      password: true,
      updatedAt: true,
    },
  });
}

// meta
export async function createUserShortUrlMeta(
  data: Omit<UrlMeta, "id" | "createdAt" | "updatedAt">,
) {
  try {
    const meta = await findOrCreateUrlMeta(data);
    return { status: "success", data: meta };
  } catch (error) {
    console.error("create meta error", error);
    return { status: "error", message: error.message };
  }
}

async function findOrCreateUrlMeta(data) {
  const meta = await prisma.urlMeta.findFirst({
    where: {
      ip: data.ip,
      urlId: data.urlId,
    },
  });

  if (meta) {
    return await incrementClick(meta.id);
  } else {
    return await prisma.urlMeta.create({ data });
  }
}

async function incrementClick(id) {
  return await prisma.urlMeta.update({
    where: { id },
    data: {
      click: { increment: 1 },
      updatedAt: new Date(), // Prisma will handle the ISO string conversion
    },
  });
}

export async function getUrlMetaLiveLog(userId?: string) {
  const whereClause = userId ? { userUrl: { userId } } : {};

  const logs = await prisma.urlMeta.findMany({
    take: 10,
    where: whereClause,
    orderBy: { updatedAt: "desc" },
    select: {
      ip: true,
      click: true,
      updatedAt: true,
      createdAt: true,
      city: true,
      country: true,
      userUrl: {
        select: {
          url: true,
          target: true,
          title: true,
          description: true,
          image: true,
        },
      },
    },
  });

  const formattedLogs = logs.map((log) => ({
    ...log,
    slug: log.userUrl.url,
    target: log.userUrl.target,
    title: log.userUrl.title,
    description: log.userUrl.description,
    image: log.userUrl.image,
  }));

  return formattedLogs;
}
