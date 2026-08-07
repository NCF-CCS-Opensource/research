export type ProfileInsert = {
  id: string
  email: string
  first_name: string
  middle_name: string | null
  last_name: string
  suffix: string | null
  institution_id: string | null
  custom_institution: string | null
  program_id: string | null
  custom_program: string | null
}

const value = (form: FormData, name: string) =>
  String(form.get(name) ?? "").trim() || null

export function onboardingProfile(
  identity: { id: string; email: string },
  form: FormData
): ProfileInsert | string {
  const firstName = value(form, "firstName")
  const lastName = value(form, "lastName")
  const institutionId = value(form, "institutionId")
  const customInstitution = value(form, "customInstitution")
  const programId = value(form, "programId")
  const customProgram = value(form, "customProgram")
  const middleName = value(form, "middleName")
  const suffix = value(form, "suffix")

  if (
    !firstName ||
    firstName.length > 100 ||
    !lastName ||
    lastName.length > 100
  )
    return "First and last names are required."
  if ((institutionId === null) === (customInstitution === null))
    return "Choose one Institution."
  if (customInstitution && customInstitution.length > 255)
    return "Institution must be 255 characters or fewer."
  if ((programId && !institutionId) || (programId && customProgram))
    return "Program must belong to the selected Institution."
  if (customProgram && (institutionId || customProgram.length > 255))
    return "Enter a valid Program for the unlisted Institution."
  if ((middleName?.length ?? 0) > 100 || (suffix?.length ?? 0) > 20)
    return "Invalid Profile details."

  return {
    id: identity.id,
    email: identity.email,
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    suffix,
    institution_id: institutionId,
    custom_institution: customInstitution,
    program_id: programId,
    custom_program: customProgram,
  }
}
