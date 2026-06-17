import { useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetRecord, useUpdateRecord, useDeleteRecord, getListRecordsQueryKey, getGetRecordQueryKey, getGetRecordStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save, Trash2, UserIcon, FileTextIcon, MapPinIcon, ShieldIcon, UsersIcon } from "lucide-react";
import { Link } from "wouter";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  fullName: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  idNumber: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  email: z.string().email("Invalid email").nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  documentType: z.string().nullable().optional(),
  fatherName: z.string().nullable().optional(),
  motherName: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  religion: z.string().nullable().optional(),
  bloodGroup: z.string().nullable().optional(),
  maritalStatus: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function FieldInput({ control, name, label, mono, span2, type }: {
  control: ReturnType<typeof useForm<FormValues>>["control"];
  name: keyof FormValues;
  label: string;
  mono?: boolean;
  span2?: boolean;
  type?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={span2 ? "sm:col-span-2" : ""}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              value={(field.value as string) || ""}
              className={mono ? "font-mono" : ""}
              type={type}
              data-testid={`input-${name}`}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default function RecordDetail() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: record, isLoading } = useGetRecord(id, {
    query: { enabled: !!id, queryKey: getGetRecordQueryKey(id) }
  });

  const updateRecord = useUpdateRecord();
  const deleteRecord = useDeleteRecord();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "", dateOfBirth: "", idNumber: "", nationality: "",
      address: "", email: "", phone: "", expiryDate: "", documentType: "",
      fatherName: "", motherName: "", gender: "", religion: "",
      bloodGroup: "", maritalStatus: "",
    },
  });

  const initRef = useRef(false);
  useEffect(() => {
    if (record && !initRef.current) {
      form.reset({
        fullName: record.fullName || "",
        dateOfBirth: record.dateOfBirth || "",
        idNumber: record.idNumber || "",
        nationality: record.nationality || "",
        address: record.address || "",
        email: record.email || "",
        phone: record.phone || "",
        expiryDate: record.expiryDate || "",
        documentType: record.documentType || "",
        fatherName: record.fatherName || "",
        motherName: record.motherName || "",
        gender: record.gender || "",
        religion: record.religion || "",
        bloodGroup: record.bloodGroup || "",
        maritalStatus: record.maritalStatus || "",
      });
      initRef.current = true;
    }
  }, [record, form]);

  const onSubmit = (values: FormValues) => {
    updateRecord.mutate(
      { id, data: values },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(getGetRecordQueryKey(id), updated);
          queryClient.invalidateQueries({ queryKey: getListRecordsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetRecordStatsQueryKey() });
          toast({ title: "Record updated successfully" });
        },
        onError: () => {
          toast({ title: "Failed to update record", variant: "destructive" });
        }
      }
    );
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this record?")) {
      deleteRecord.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListRecordsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetRecordStatsQueryKey() });
            toast({ title: "Record deleted" });
            setLocation("/records");
          },
          onError: () => {
            toast({ title: "Failed to delete record", variant: "destructive" });
          }
        }
      );
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!record) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-muted-foreground">Record not found</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto bg-slate-50/50">
        <div className="border-b bg-white px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Link href="/records" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Record #{record.id}</h1>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{record.fileName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDelete}
              disabled={deleteRecord.isPending}
              data-testid="btn-delete-record"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
            <Button onClick={form.handleSubmit(onSubmit)} disabled={updateRecord.isPending} data-testid="btn-save-record">
              {updateRecord.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>

        <div className="p-8 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-primary" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid sm:grid-cols-2 gap-4">
                    <FieldInput control={form.control} name="fullName" label="Full Name" span2 />
                    <FieldInput control={form.control} name="dateOfBirth" label="Date of Birth" />
                    <FieldInput control={form.control} name="nationality" label="Nationality" />
                    <FieldInput control={form.control} name="gender" label="Gender" />
                    <FieldInput control={form.control} name="maritalStatus" label="Marital Status" />
                    <FieldInput control={form.control} name="religion" label="Religion" />
                    <FieldInput control={form.control} name="bloodGroup" label="Blood Group" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldIcon className="w-4 h-4 text-primary" />
                      Document Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid sm:grid-cols-2 gap-4">
                    <FieldInput control={form.control} name="documentType" label="Document Type" />
                    <FieldInput control={form.control} name="idNumber" label="ID Number" mono />
                    <FieldInput control={form.control} name="expiryDate" label="Expiry Date" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <UsersIcon className="w-4 h-4 text-primary" />
                      Family
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid sm:grid-cols-2 gap-4">
                    <FieldInput control={form.control} name="fatherName" label="Father Name" />
                    <FieldInput control={form.control} name="motherName" label="Mother Name" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPinIcon className="w-4 h-4 text-primary" />
                      Contact & Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid sm:grid-cols-2 gap-4">
                    <FieldInput control={form.control} name="address" label="Address" span2 />
                    <FieldInput control={form.control} name="email" label="Email" type="email" />
                    <FieldInput control={form.control} name="phone" label="Phone / Mobile" />
                  </CardContent>
                </Card>
              </form>
            </Form>
          </div>

          <div>
            <Card className="sticky top-24 bg-slate-900 text-slate-50 border-slate-800 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2 text-slate-50">
                  <FileTextIcon className="w-4 h-4 text-primary" />
                  Raw OCR Text
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Original text extracted from the document
                </CardDescription>
              </CardHeader>
              <Separator className="bg-slate-800" />
              <CardContent className="p-0">
                <div className="h-[500px] overflow-auto p-4 text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {record.rawText || "No raw text available."}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
